import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt-builder';
import { getBuildingProfile } from './buildings/building-registry';
import { InventorySummaryService } from './inventory-summary.service';
import { ChatMessage, normalizeHistory } from './chat-history';

/** Se reexporta para no romper los imports existentes de los webhooks. */
export type { ChatMessage };

/** De qué edificio habla esta conversación. */
export interface NovaContext {
  /** Slug del tenant; debe tener un perfil en `building-registry`. */
  buildingSlug: string;
  /** Proyecto del que sale el inventario. */
  projectId?: string;
}

const FALLBACK_MESSAGE =
  'Disculpa, no entendí bien tu mensaje. ¿Me puedes contar un poco más sobre lo que buscas? Con gusto te ayudo 😊';
const ERROR_MESSAGE =
  'Ups, tuve un pequeño problema técnico. ¿Puedes repetir tu mensaje? Estoy aquí para ayudarte.';

/**
 * En WhatsApp, 1024 tokens son varias pantallas. Una instrucción de "sé breve"
 * en el prompt es una sugerencia; esto es un techo.
 */
const MAX_TOKENS = 400;

export interface LeadExtraction {
  name?: string;
  /** Correo que el prospecto dio en el chat. En prelanzamiento es el objetivo. */
  email?: string;
  interested_in?: string;
  financing?: string;
  priority?: string;
  ai_score?: number;
  /** El modelo detectó que la conversación necesita un asesor humano. */
  needs_human?: boolean;
}

@Injectable()
export class NovaService {
  private readonly logger = new Logger(NovaService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    private readonly inventory: InventorySummaryService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Devuelve la respuesta de Nova, o `null` si no puede responder por el
   * edificio de esta conversación. `null` significa "no mandes nada": es
   * preferible el silencio a responder con los datos de otro proyecto.
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    ctx: NovaContext,
  ): Promise<string | null> {
    if (!userMessage || userMessage.trim().length < 2) {
      return FALLBACK_MESSAGE;
    }

    let systemPrompt: string;
    try {
      const profile = getBuildingProfile(ctx.buildingSlug);
      // Un proyecto en prelanzamiento no tiene unidades cargadas: la consulta
      // sobraría, y el prompt de esa etapa ni siquiera habla de inventario.
      const inventory =
        profile.stage === 'prelaunch'
          ? null
          : await this.inventory.getSummary(ctx.projectId);
      systemPrompt = buildSystemPrompt(profile, inventory);
    } catch (err) {
      this.logger.error(
        `Sin perfil utilizable para "${ctx.buildingSlug}": ${err?.message}. Nova no responde.`,
      );
      return null;
    }

    try {
      // La API exige que el primer mensaje sea del usuario; el historial de la
      // base puede empezar con Nova o con el asesor.
      const messages: Anthropic.MessageParam[] = [
        ...normalizeHistory(conversationHistory).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('');

      this.logger.log(
        `Nova respondió [${ctx.buildingSlug}] (${response.usage.input_tokens} tokens in / ${response.usage.output_tokens} out)`,
      );

      return text;
    } catch (err) {
      this.logger.error('Error calling Anthropic API', err);
      return ERROR_MESSAGE;
    }
  }

  async extractLeadInfo(
    conversationHistory: ChatMessage[],
  ): Promise<LeadExtraction> {
    if (conversationHistory.length < 2) return {};

    const transcript = conversationHistory
      .map((m) => `${m.role === 'user' ? 'Prospecto' : 'Nova'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: `Eres un extractor de datos. Analiza la conversación y responde SOLO con un JSON válido sin texto adicional.
Extrae: nombre real del prospecto (si lo mencionó), correo electrónico (email, si lo dio), propósito (para vivir/invertir), financiamiento (FNA/subsidio/recursos propios/combinación), nivel de interés (ai_score 1-100), prioridad (high/medium/low), y needs_human (true si el prospecto pregunta por su caso concreto de crédito, intenta negociar el precio, presenta una queja, pide hablar con un asesor, o la conversación lleva dos turnos sin avanzar).
Si un campo no está claro, omítelo del JSON. No inventes un correo: cópialo tal cual lo escribió el prospecto o no lo incluyas.
Ejemplo: {"name":"Carlos","email":"carlos@gmail.com","interested_in":"para vivir","financing":"FNA","ai_score":70,"priority":"medium","needs_human":false}`,
        messages: [{ role: 'user', content: `Conversación:\n${transcript}` }],
      });

      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');

      return JSON.parse(raw) as LeadExtraction;
    } catch {
      return {};
    }
  }
}
