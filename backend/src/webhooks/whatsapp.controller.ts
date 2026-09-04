import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';
import { NovaService, ChatMessage } from '../nova/nova.service';
import { parseNovaCommand } from '../nova/nova-commands';
import { shouldAutoResume, DEFAULT_RESUME_HOURS } from '../nova/nova-pause';
import { assistantNameFor } from '../nova/buildings/building-registry';
import {
  DEFAULT_HISTORY_WINDOW,
  splitHistory,
  toTranscript,
} from '../nova/conversation-memory';
import { WhapiService } from './whapi.service';
import { extractMessages } from './extract-messages';
import { resolveLeadProject } from './resolve-lead-project';
import { resolveBuildingSlug } from './resolve-building-slug';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ProjectsService } from '../projects/projects.service';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';

@Public()
@ApiTags('Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly leadsService: LeadsService,
    private readonly novaService: NovaService,
    private readonly whapiService: WhapiService,
    private readonly tenantsService: TenantsService,
    private readonly projectsService: ProjectsService,
    private readonly configService: ConfigService,
  ) {}

  /** GET — Whapi/WhatsApp webhook verification challenge */
  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ message: 'Forbidden' });
  }

  /** POST — Receive incoming WhatsApp messages (?tenant=slug for multi-tenant routing) */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any, @Query('tenant') tenantSlug?: string) {
    try {
      // ── 1. Resolver tenant ────────────────────────────────────────────────
      let tenantId: string | undefined;
      let whapiToken: string | undefined;
      let tenant: Tenant | null = null;

      if (tenantSlug) {
        tenant = await this.tenantsService.findBySlug(tenantSlug);
        if (tenant) {
          tenantId = tenant.id;
          whapiToken = tenant.whapi_token;
        } else {
          this.logger.warn(`Webhook received for unknown tenant slug: ${tenantSlug}`);
        }
      }

      if (!whapiToken) whapiToken = this.configService.get<string>('WHAPI_TOKEN');

      // El proyecto del lead sale del tenant, y solo del tenant. El respaldo
      // del entorno apunta a un edificio concreto: aplicarlo cuando el tenant
      // ya se resolvió registra al prospecto en la cartera de otra empresa.
      const { projectId, problem } = resolveLeadProject({
        tenant,
        configuredProject: tenant?.default_project_id
          ? await this.projectsService.findForWebhook(tenant.default_project_id)
          : null,
        envProjectId: this.configService.get<string>('DEFAULT_PROJECT_ID'),
      });
      if (problem) this.logger.error(problem);

      // Sin tenant resuelto no se adivina el edificio: `buildingSlug` queda
      // vacío, Nova no encuentra perfil y no responde. El mensaje entrante sí se
      // guarda, así que la conversación no se pierde y se puede retomar en
      // cuanto la URL del webhook esté bien.
      const { slug, problem: buildingProblem } = resolveBuildingSlug({
        tenant,
        requestedSlug: tenantSlug,
      });
      const buildingSlug = slug ?? '';
      if (buildingProblem) this.logger.error(buildingProblem);

      // Un valor no numérico daría NaN, y `elapsed >= NaN` es siempre falso: la
      // reactivación automática dejaría de funcionar sin que nadie se entere.
      const configuredHours = Number(
        this.configService.get<string>('NOVA_RESUME_HOURS'),
      );
      const resumeHours =
        Number.isFinite(configuredHours) && configuredHours > 0
          ? configuredHours
          : DEFAULT_RESUME_HOURS;

      // Cuántos mensajes viajan textuales. Lo que queda fuera no se pierde:
      // se pliega en el resumen acumulativo de la conversación.
      const configuredWindow = Number(
        this.configService.get<string>('NOVA_HISTORY_MESSAGES'),
      );
      const historyWindow =
        Number.isFinite(configuredWindow) && configuredWindow > 0
          ? configuredWindow
          : DEFAULT_HISTORY_WINDOW;

      // ── 2. Extraer mensajes (salientes del asesor incluidos) ──────────────
      const { messages, outgoingWithoutSource } = extractMessages(body);

      if (outgoingWithoutSource > 0) {
        // Sin `source` no podemos distinguir al asesor del eco de la propia
        // Nova, así que se descartan. Si esto aparece, el control desde
        // WhatsApp no está funcionando y hay que revisar la API de Whapi.
        this.logger.warn(
          `${outgoingWithoutSource} mensaje(s) saliente(s) sin campo "source": descartados`,
        );
      }

      for (const { from: rawFrom, messageId, text, profileName, fromMe, type } of messages) {
        // Los contactos por LID llegan con un identificador distinto al del
        // chat canónico, que es el del teléfono. Sin traducirlo, la misma
        // persona genera dos conversaciones —sus mensajes bajo el LID, los del
        // asesor bajo el número— y pausar una no silencia la otra.
        const from = await this.whapiService.resolveChatPhone(rawFrom, whapiToken);

        // Si el identificador cambió, este contacto ya escribió antes bajo el
        // anterior —era un desconocido y alguien lo guardó en la agenda—. Su
        // conversación se unifica en vez de empezar una nueva y perder lo que
        // ya se habló con él.
        if (from !== rawFrom) {
          await this.conversationsService.mergeConversationIdentity(
            rawFrom,
            from,
            tenantId,
          );
        }

        // ── 3. Mensaje del asesor: comando o toma de control ────────────────
        if (fromMe) {
          await this.handleAgentMessage({
            phone: from,
            messageId,
            text,
            type,
            tenantId,
            whapiToken,
          });
          continue;
        }

        this.logger.log(
          `Incoming WhatsApp from ${from} [tenant:${tenantSlug ?? 'default'}]: "${text}"`,
        );

        // ── 4. Conversación, lead y mensaje entrante ────────────────────────
        const conv = await this.conversationsService.findOrCreateByPhone(
          from, 'whatsapp', profileName, tenantId,
        );
        const isNewConversation = !conv.lead_id;

        // Se captura ANTES de ingerir el mensaje: después, `last_message_at`
        // apunta al mensaje actual y el silencio siempre daría cero.
        const ultimoMensajePrevio = conv.last_message_at ?? null;

        if (isNewConversation && projectId) {
          const { lead, created } = await this.leadsService.findOrCreateByPhone(
            from,
            projectId,
            profileName !== from ? profileName : undefined,
          );
          if (created) {
            this.logger.log(`Lead creado automáticamente: ${lead.id} para ${from}`);
          }
          await this.conversationsService.updateConversation(conv.id, { lead_id: lead.id });
        }

        await this.conversationsService.ingestWhatsAppMessage({
          from,
          messageId,
          body: text,
          profileName,
          timestamp: String(Date.now()),
          // La conversación ya está resuelta con su tenant: sin esto el
          // servicio la vuelve a buscar solo por teléfono y, con dos tenants,
          // puede escribir el mensaje en la conversación del otro edificio.
          conversationId: conv.id,
        });

        // ── 5. Pausa y ventana de reactivación ──────────────────────────────
        // Antes de leer el historial: una conversación pausada no lo necesita.
        const freshConv = await this.conversationsService.findConversationById(conv.id);
        if (freshConv.nova_paused) {
          if (shouldAutoResume(freshConv, new Date(), resumeHours)) {
            await this.conversationsService.resumeNova(conv.id);
            this.logger.log(
              `Nova retoma ${from} — ${resumeHours}h sin actividad del asesor`,
            );
          } else {
            this.logger.log(`Nova pausada para ${from} — asesor tiene el control`);
            continue;
          }
        }

        const allMessages = await this.conversationsService.getMessagesForNova(conv.id);

        // El último es el que acabamos de ingerir: va aparte, como el turno
        // que Nova está respondiendo.
        const previos = allMessages.slice(0, -1);
        const { window, toSummarize } = splitHistory(
          previos,
          historyWindow,
          freshConv.memory_summary_until,
        );

        const history: ChatMessage[] = window.map((m) => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

        // ── 6. Responder ────────────────────────────────────────────────────
        // La ficha del CRM le da memoria más allá de los últimos 20 mensajes:
        // sin esto, a los tres meses le vuelve a preguntar el nombre a alguien
        // que ya está registrado con nombre, correo y propósito.
        const lead = freshConv.lead_id
          ? await this.leadsService.findByIdForWebhook(freshConv.lead_id)
          : null;

        // Un lead autocreado guarda el teléfono como nombre (`name || phone`),
        // y en los contactos por LID el nombre de WhatsApp puede ser un alias
        // decorativo. Pasar eso haría que Nova salude a alguien por su número.
        const nombreUtil =
          lead?.name && lead.name !== from && lead.name !== lead.phone
            ? lead.name
            : null;

        const novaReply = await this.novaService.generateResponse(text, history, {
          buildingSlug,
          projectId,
          prospect: {
            name: nombreUtil,
            email: lead?.email,
            interested_in: lead?.interested_in,
            status: lead?.status,
            firstContactAt: lead?.created_at,
            lastMessageAt: ultimoMensajePrevio,
            conversationSummary: freshConv.memory_summary,
          },
        });

        if (!novaReply) {
          this.logger.warn(
            `Nova no respondió a ${from}: sin perfil utilizable para "${buildingSlug}"`,
          );
          continue;
        }

        // Enviar ANTES de guardar. Si el envío falla y el mensaje se guarda
        // igual, Nova queda creyendo que dijo algo que el prospecto nunca
        // leyó: en el siguiente turno no vuelve a saludar y responde como si
        // hubiera una conversación en curso que, del otro lado, no existe.
        // Sin guardar, la próxima vez lo intenta de nuevo desde el principio.
        const enviado = await this.whapiService.sendText(from, novaReply, whapiToken);

        if (!enviado) {
          this.logger.error(
            `No se pudo entregar la respuesta a ${from}; no se guarda para que Nova la reintente`,
          );
          continue;
        }

        await this.conversationsService.addMessage(conv.id, {
          content: novaReply,
          sender_type: 'bot',
          sender_name: 'Nova',
        });

        this.logger.log(`Nova replied to ${from}: "${novaReply.substring(0, 80)}..."`);

        // ── 7. Avance del lead ──────────────────────────────────────────────
        // `freshConv` ya trae el lead_id y no pudo cambiar entre medias.
        if (freshConv.lead_id && allMessages.length <= 2) {
          await this.leadsService.updateFromNova(freshConv.lead_id, { status: 'contacted' });
          this.logger.log(`Lead ${freshConv.lead_id} → contacted`);
        }

        // Cada dos turnos del cliente. Contar filas totales no sirve: en una
        // conversación alternada `allMessages` se lee siempre en número impar
        // —el mensaje del cliente ya guardado, la respuesta de Nova todavía
        // no— así que un módulo sobre el total nunca se cumpliría.
        const userTurns = allMessages.filter((m) => m.sender_type === 'user').length;
        if (userTurns >= 2 && userTurns % 2 === 0) {
          this.enrichLeadAsync(
            conv.id,
            [...history, { role: 'user', content: text }],
            assistantNameFor(buildingSlug),
          );
        }

        // Lo que salió de la ventana se pliega al resumen. Va después de haber
        // respondido y sin await: es memoria para la próxima vez, no algo que
        // el prospecto deba esperar.
        if (toSummarize.length > 0) {
          this.updateMemoryAsync(
            conv.id,
            freshConv.memory_summary,
            toSummarize,
            assistantNameFor(buildingSlug),
          );
        }
      }
    } catch (err) {
      this.logger.error('Error processing WhatsApp webhook', err);
    }

    return { status: 'ok' };
  }

  /**
   * Mensaje escrito desde el WhatsApp del negocio. O es un comando de control, o
   * es el asesor atendiendo — y en ese caso Nova se calla en ese chat.
   */
  private async handleAgentMessage(params: {
    phone: string;
    messageId: string;
    text: string;
    /** `text`, `voice`, `image`… Solo los de texto pueden ser un comando. */
    type: string;
    tenantId?: string;
    whapiToken?: string;
  }): Promise<void> {
    const { phone, messageId, text, type, tenantId, whapiToken } = params;

    const conv = await this.conversationsService.findOrCreateByPhone(
      phone, 'whatsapp', undefined, tenantId,
    );

    const isText = type === 'text';
    const command = isText ? parseNovaCommand(text) : null;

    if (command === 'pause') {
      await this.conversationsService.pauseNova(conv.id, 'whatsapp');
      this.logger.log(`#pausa — Nova silenciada en ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    if (command === 'resume') {
      await this.conversationsService.resumeNova(conv.id);
      this.logger.log(`#nova — Nova retoma ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    // No hay comando de estado: cualquier respuesta al chat la vería el
    // prospecto. El estado de la conversación se consulta en el CRM.

    // No es comando: el asesor está atendiendo. Se guarda y Nova se calla.
    // Una nota de voz cuenta igual que un texto — en este mercado suele ser la
    // primera respuesta del asesor, y Nova no puede seguir escribiendo encima.
    await this.conversationsService.addMessage(conv.id, {
      content: isText ? text : `[${type || 'adjunto'} del asesor]`,
      sender_type: 'agent',
      sender_name: 'Asesor',
      whatsapp_message_id: messageId,
    });
    await this.conversationsService.pauseNova(conv.id, 'whatsapp');
    this.logger.log(`Asesor escribió a ${phone} (${type}) — Nova pausada`);
  }

  /**
   * Fire-and-forget: pliega al resumen los mensajes que salieron de la ventana.
   *
   * Solo avanza el marcador si el resumen se actualizó de verdad. Si el modelo
   * falla, esos mensajes quedan pendientes y se reintentan en el próximo turno
   * — perderlos significaría un hueco permanente en la memoria.
   */
  private async updateMemoryAsync(
    convId: string,
    resumenPrevio: string | null,
    porResumir: Array<{ sender_type: string; content: string; created_at: Date }>,
    assistantName: string,
  ) {
    try {
      const nuevo = await this.novaService.summarizeConversation(
        resumenPrevio,
        toTranscript(porResumir, assistantName),
        assistantName,
      );
      if (!nuevo) return;

      await this.conversationsService.updateConversation(convId, {
        memory_summary: nuevo,
        memory_summary_until: porResumir[porResumir.length - 1].created_at,
      });
      this.logger.log(
        `Memoria de ${convId} actualizada con ${porResumir.length} mensaje(s)`,
      );
    } catch (err) {
      this.logger.warn(`Error actualizando la memoria: ${err?.message}`);
    }
  }

  /** Fire-and-forget: extract lead info and auto-advance pipeline status */
  private async enrichLeadAsync(
    convId: string,
    history: ChatMessage[],
    assistantName: string,
  ) {
    try {
      const extraction = await this.novaService.extractLeadInfo(history, assistantName);
      if (Object.keys(extraction).length === 0) return;

      const conv = await this.conversationsService.findConversationById(convId);
      if (!conv.lead_id) return;

      // Queda marcada para que un asesor la vea, pero Nova SIGUE respondiendo:
      // callarse sola dejaba al prospecto sin respuesta hasta que alguien
      // abriera el CRM, y si nadie lo hacía, para siempre.
      if (extraction.needs_human) {
        await this.conversationsService.markNeedsHuman(convId);
        this.logger.log(`Conversación ${convId} marcada: conviene que la vea un asesor`);
      }

      // ── Determine next status based on extraction ──────────────────────────
      let nextStatus: string | undefined;

      // Check if a visit was mentioned in the last messages
      const recentText = history
        .slice(-6)
        .map((m) => m.content.toLowerCase())
        .join(' ');

      const visitKeywords = ['visita', 'sala de ventas', 'agendar', 'lunes', 'martes',
        'miércoles', 'jueves', 'viernes', 'sábado', 'mañana', 'pasado mañana',
        'esta semana', 'próxima semana', 'te confirmo', 'voy a ir', 'puedo ir'];

      const visitMentioned = visitKeywords.some((kw) => recentText.includes(kw));

      if (visitMentioned) {
        nextStatus = 'pending'; // Visit scheduled
      } else if (
        (extraction.ai_score !== undefined && extraction.ai_score >= 60) ||
        extraction.priority === 'high'
      ) {
        nextStatus = 'qualified';
      }

      await this.leadsService.updateFromNova(conv.lead_id, {
        name: extraction.name,
        email: extraction.email,
        interested_in: extraction.financing
          ? `${extraction.interested_in || ''} | ${extraction.financing}`.replace(/^\s*\|\s*/, '').trim()
          : extraction.interested_in,
        ai_score: extraction.ai_score,
        priority: extraction.priority,
        status: nextStatus,
      });

      this.logger.log(
        `Lead ${conv.lead_id} enriquecido — score: ${extraction.ai_score ?? '?'}, status: ${nextStatus ?? 'sin cambio'}`,
      );
    } catch (err) {
      this.logger.warn('Error enriqueciendo lead:', err?.message);
    }
  }
}
