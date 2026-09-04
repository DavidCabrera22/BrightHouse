import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LEAD_CREATED,
  LEAD_STATUS_CHANGED,
} from '../automations/automation-events';

// ─── AI Score ─────────────────────────────────────────────────────────────────
// Deterministic score based on real lead data. No API calls needed.
function calculateScore(lead: Partial<Lead>): number {
  let score = 0;

  // Status weight (biggest factor)
  const statusScore: Record<string, number> = {
    won: 100, negotiation: 88, qualified: 72,
    contacted: 42, pending: 30, new: 20, lost: 5,
  };
  score += statusScore[lead.status ?? 'new'] ?? 20;

  // Source bonus
  const sourceBonus: Record<string, number> = {
    whatsapp: 12, referral: 10, event: 8, web: 5, ads: 3,
  };
  score += sourceBonus[lead.source ?? ''] ?? 0;

  // Data completeness
  if (lead.phone) score += 5;
  if (lead.email) score += 3;
  if (lead.interested_in) score += 4;
  if (lead.potential_value && lead.potential_value > 0) score += 3;

  // Recency bonus (newer leads get extra points)
  if (lead.created_at) {
    const daysOld = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000;
    if (daysOld < 1) score += 8;
    else if (daysOld < 3) score += 5;
    else if (daysOld < 7) score += 3;
  }

  return Math.min(100, Math.round(score));
}

export interface AiSuggestion {
  action: string;
  whatsapp_message: string;
  urgency: 'alta' | 'media' | 'baja';
  reason: string;
}

@Injectable()
export class LeadsService {
  private readonly anthropic: Anthropic;

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    private readonly configService: ConfigService,
    private readonly tenantScope: TenantScopeService,
    private readonly events: EventEmitter2,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Repartir cartera es cosa de quien dirige, no de quien vende.
   *
   * `PATCH /leads/:id` está abierto a Agent porque un asesor tiene que poder
   * trabajar su lead —cambiarle el estado, corregir el teléfono—. Pero
   * `assigned_agent_id` viajaba en el mismo DTO sin filtro, así que una asesora
   * podía pasarse a su nombre la cartera de otra con una sola llamada. Que la
   * interfaz no tuviera un botón para hacerlo no era una restricción.
   *
   * Un asesor solo puede quedarse leads suyos; el dueño ajeno se descarta en
   * silencio, igual que `users.service` descarta el `tenant_id` que no le toca.
   */
  private canAssignFreely(ctx: TenantContext): boolean {
    return ctx.isSuperAdmin || ctx.role === 'Admin';
  }

  async create(createLeadDto: CreateLeadDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(createLeadDto.project_id, ctx);

    // El espejo del caso de `update`: sin esto bastaría con crear para colarse.
    const payload = this.canAssignFreely(ctx)
      ? createLeadDto
      : { ...createLeadDto, assigned_agent_id: ctx.userId };

    const lead = this.leadRepository.create(payload);
    lead.ai_score = calculateScore(lead);
    const saved = await this.leadRepository.save(lead);
    this.events.emit(LEAD_CREATED, { leadId: saved.id });
    return saved;
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Lead, 'lead', ctx)
      .leftJoinAndSelect('lead.project', 'project')
      .leftJoinAndSelect('lead.assigned_agent', 'agent')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const lead = await this.tenantScope
      .scoped(Lead, 'lead', ctx)
      .leftJoinAndSelect('lead.project', 'project')
      .leftJoinAndSelect('lead.assigned_agent', 'assigned_agent')
      .andWhere('lead.id = :id', { id })
      .getOne();
    if (!lead) throw new NotFoundException(`Lead ${id} no encontrado`);
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, ctx: TenantContext) {
    const lead = await this.findOne(id, ctx);
    await this.tenantScope.assertProjectInTenant((updateLeadDto as any).project_id, ctx);
    const previousStatus = lead.status;

    // Nunca client-controlled para un asesor: el lead se queda con su dueño.
    const { assigned_agent_id, ...safe } = updateLeadDto as any;
    Object.assign(lead, safe);
    if (this.canAssignFreely(ctx) && assigned_agent_id !== undefined) {
      lead.assigned_agent_id = assigned_agent_id;
    }
    // Recalculate score whenever lead data changes
    lead.ai_score = calculateScore(lead);
    const saved = await this.leadRepository.save(lead);
    if (updateLeadDto.status && updateLeadDto.status !== previousStatus) {
      this.events.emit(LEAD_STATUS_CHANGED, {
        leadId: saved.id,
        from: previousStatus,
        to: saved.status,
      });
    }
    return saved;
  }

  async remove(id: string, ctx: TenantContext) {
    const lead = await this.findOne(id, ctx);
    return this.leadRepository.remove(lead);
  }

  // ─── AI Suggestion ───────────────────────────────────────────────────────────
  async getSuggestion(id: string, ctx: TenantContext): Promise<AiSuggestion> {
    const lead = await this.findOne(id, ctx);

    const daysInCrm = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000,
    );

    const prompt = `Eres un experto en ventas inmobiliarias. Analiza este prospecto y da una recomendación concreta.

DATOS DEL PROSPECTO:
- Nombre: ${lead.name}
- Estado en el pipeline: ${lead.status}
- Fuente: ${lead.source}
- Proyecto de interés: ${lead.project?.name ?? 'No especificado'}
- Unidad/tipo de interés: ${lead.interested_in ?? 'No especificado'}
- Días en el CRM: ${daysInCrm}
- Tiene teléfono: ${lead.phone ? 'sí' : 'no'}
- Tiene email: ${lead.email ? 'sí' : 'no'}
- Puntaje IA actual: ${lead.ai_score ?? 'sin calcular'}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicación adicional):
{
  "action": "una acción concreta que el agente debe hacer ahora (máx 80 caracteres)",
  "whatsapp_message": "mensaje de WhatsApp personalizado en español, natural y amigable (máx 160 caracteres)",
  "urgency": "alta|media|baja",
  "reason": "una frase corta explicando por qué esta es la mejor acción (máx 100 caracteres)"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (response.content[0] as Anthropic.TextBlock).text.trim();
      return JSON.parse(text) as AiSuggestion;
    } catch {
      // Fallback if Claude is unavailable
      return {
        action: 'Llamar o enviar WhatsApp para hacer seguimiento',
        whatsapp_message: `Hola ${lead.name}, te contactamos desde BrightHouse para saber si sigues interesado en ${lead.project?.name ?? 'el proyecto'}. ¿Tienes un momento?`,
        urgency: daysInCrm > 7 ? 'alta' : 'media',
        reason: 'Seguimiento estándar basado en tiempo en CRM',
      };
    }
  }

  // ─── Recalculate scores for all leads (bulk) ─────────────────────────────────
  async recalculateAllScores(ctx: TenantContext): Promise<number> {
    const leads = await this.tenantScope.scoped(Lead, 'lead', ctx).getMany();
    for (const lead of leads) {
      lead.ai_score = calculateScore(lead);
    }
    await this.leadRepository.save(leads);
    return leads.length;
  }

  // ─── Used by Nova / WhatsApp ─────────────────────────────────────────────────
  async findOrCreateByPhone(
    phone: string,
    projectId: string,
    name?: string,
    /**
     * Quién atiende los leads que entran por el chatbot de este tenant.
     *
     * Solo se aplica al crear: si el lead ya existe, su dueño no se toca. Un
     * mensaje nuevo del prospecto no puede quitarle la ficha al asesor que ya
     * la tenía.
     */
    assignedAgentId?: string,
  ): Promise<{ lead: Lead; created: boolean }> {
    // La búsqueda va atada al proyecto. Solo por teléfono, alguien que ya es
    // lead de un edificio y escribe al WhatsApp de otro reutilizaría la ficha
    // del primero, y su conversación quedaría colgando del tenant equivocado.
    const existing = await this.leadRepository.findOne({
      where: { phone, project_id: projectId },
    });
    if (existing) return { lead: existing, created: false };

    const lead = this.leadRepository.create({
      phone,
      name: name || phone,
      project_id: projectId,
      source: 'whatsapp',
      status: 'new',
      ...(assignedAgentId ? { assigned_agent_id: assignedAgentId } : {}),
    });
    lead.ai_score = calculateScore(lead);
    const saved = await this.leadRepository.save(lead);
    this.events.emit(LEAD_CREATED, { leadId: saved.id });
    return { lead: saved, created: true };
  }

  /**
   * "Convertir en Lead" desde la bandeja de entrada. Ruta de request: valida el
   * proyecto contra el tenant de quien pulsa el botón, y si esa persona ya es
   * lead de ese proyecto devuelve su ficha en vez de duplicarla.
   */
  async createFromConversation(
    input: {
      project_id: string;
      name: string;
      phone: string;
      email?: string;
      source: string;
    },
    ctx: TenantContext,
  ): Promise<Lead> {
    await this.tenantScope.assertProjectInTenant(input.project_id, ctx);

    const existing = await this.leadRepository.findOne({
      where: { phone: input.phone, project_id: input.project_id },
    });
    if (existing) return existing;

    const lead = this.leadRepository.create({
      project_id: input.project_id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      source: input.source,
      status: 'new',
    });
    lead.ai_score = calculateScore(lead);
    const saved = await this.leadRepository.save(lead);
    this.events.emit(LEAD_CREATED, { leadId: saved.id });
    return saved;
  }

  /**
   * Lee un lead sin filtrar por tenant. Es una ruta de sistema: la llama el
   * webhook con el `lead_id` que ya cuelga de una conversación resuelta con su
   * tenant, así que el aislamiento ya ocurrió antes. Cualquier ruta de request
   * debe usar `findOne(id, ctx)`, que sí valida.
   */
  async findByIdForWebhook(id: string): Promise<Lead | null> {
    return this.leadRepository.findOne({ where: { id } });
  }

  async updateFromNova(
    id: string,
    data: { name?: string; email?: string; interested_in?: string; ai_score?: number; priority?: string; status?: string },
  ): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) return;

    const updates: Partial<Lead> = {};
    if (data.name) updates.name = data.name;
    if (data.interested_in) updates.interested_in = data.interested_in;
    if (data.priority) updates.priority = data.priority;

    // El correo solo se escribe si el lead no tenía uno: lo que el asesor haya
    // registrado a mano vale más que lo que el modelo leyó del chat.
    if (data.email && !lead.email) updates.email = data.email;

    // Only advance status — never go backwards
    const statusOrder = ['new', 'contacted', 'pending', 'qualified', 'negotiation', 'won', 'lost'];
    if (data.status) {
      const currentIdx = statusOrder.indexOf(lead.status);
      const newIdx     = statusOrder.indexOf(data.status);
      if (newIdx > currentIdx) updates.status = data.status;
    }

    // Recalculate score with latest data
    const merged = { ...lead, ...updates, ai_score: data.ai_score };
    updates.ai_score = calculateScore(merged);

    if (Object.keys(updates).length > 0) {
      await this.leadRepository.update(id, updates);
      if (updates.status && updates.status !== lead.status) {
        this.events.emit(LEAD_STATUS_CHANGED, {
          leadId: id,
          from: lead.status,
          to: updates.status,
        });
      }
    }
  }
}
