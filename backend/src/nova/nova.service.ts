import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
 * En WhatsApp, mil tokens son varias pantallas. Una instrucción de "sé breve"
 * en el prompt es una sugerencia; esto es un techo.
 */
const MAX_TOKENS = 400;

/**
 * Groq expone una API compatible con la de OpenAI, así que se usa el SDK de
 * OpenAI apuntado a su base URL. Todo es configurable por entorno: cambiar de
 * proveedor compatible o de modelo no debería exigir tocar código.
 */
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * `moonshotai/kimi-k2-instruct` quedó descontinuado —Groq lo reemplazó por
 * este modelo, y Moonshot discontinuó la serie—, así que el valor por defecto
 * es el sucesor que la propia Groq recomienda.
 */
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/** La extracción es una tarea mecánica: un modelo pequeño basta y es más rápido. */
const DEFAULT_EXTRACTION_MODEL = 'llama-3.1-8b-instant';

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
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly extractionModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly inventory: InventorySummaryService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
      baseURL:
        this.configService.get<string>('GROQ_BASE_URL') ?? DEFAULT_BASE_URL,
    });
    this.model = this.configService.get<string>('GROQ_MODEL') ?? DEFAULT_MODEL;
    this.extractionModel =
      this.configService.get<string>('GROQ_EXTRACTION_MODEL') ??
      DEFAULT_EXTRACTION_MODEL;

    if (!this.configService.get<string>('GROQ_API_KEY')) {
      this.logger.error(
        'GROQ_API_KEY no está configurada — Nova no podrá responder ningún mensaje',
      );
    }
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
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...normalizeHistory(conversationHistory).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        messages,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) {
        this.logger.warn('El modelo devolvió una respuesta vacía');
        return ERROR_MESSAGE;
      }

      this.logger.log(
        `Nova respondió [${ctx.buildingSlug}] (${response.usage?.prompt_tokens ?? '?'} tokens in / ${response.usage?.completion_tokens ?? '?'} out)`,
      );

      return text;
    } catch (err) {
      this.logger.error(`Error llamando a ${this.model}`, err);
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
      const response = await this.client.chat.completions.create({
        model: this.extractionModel,
        max_tokens: 200,
        // Obliga al modelo a devolver JSON válido, en vez de confiar en que
        // obedezca la instrucción del prompt.
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Eres un extractor de datos. Analiza la conversación y responde SOLO con un JSON válido sin texto adicional.
Extrae: nombre real del prospecto (name, si lo mencionó), correo electrónico (email, si lo dio), propósito (interested_in: para vivir/invertir), financiamiento (financing: FNA/subsidio/recursos propios/combinación), nivel de interés (ai_score 1-100), prioridad (priority: high/medium/low), y needs_human (true si el prospecto pregunta por su caso concreto de crédito, intenta negociar el precio, presenta una queja, pide hablar con un asesor, o la conversación lleva dos turnos sin avanzar).
Si un campo no está claro, omítelo del JSON. No inventes un correo: cópialo tal cual lo escribió el prospecto o no lo incluyas.
Ejemplo: {"name":"Carlos","email":"carlos@gmail.com","interested_in":"para vivir","financing":"FNA","ai_score":70,"priority":"medium","needs_human":false}`,
          },
          { role: 'user', content: `Conversación:\n${transcript}` },
        ],
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) return {};

      return JSON.parse(raw) as LeadExtraction;
    } catch (err) {
      // Con `needs_human` viajando en este JSON, un fallo silencioso significa
      // "no escalar" — conviene que quede registrado.
      this.logger.warn(`No se pudo extraer info del lead: ${err?.message}`);
      return {};
    }
  }
}
