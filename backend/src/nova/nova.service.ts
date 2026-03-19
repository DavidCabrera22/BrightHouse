import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class NovaService {
  private readonly logger = new Logger(NovaService.name);
  private readonly client: Anthropic;
  private readonly knowledgeBase: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.knowledgeBase = this.loadKnowledgeBase();
  }

  private loadKnowledgeBase(): string {
    const novaDir = path.join(process.cwd(), '..', 'nova-agent');
    const files = [
      'proyecto_oasis_park.md',
      'faq_oasis_park.md',
      'politicas_pago_oasis.md',
      'catalogo_unidades_oasis.csv',
    ];

    const parts: string[] = [];
    for (const file of files) {
      const filePath = path.join(novaDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        parts.push(`=== ${file} ===\n${content}`);
      } catch {
        this.logger.warn(`Knowledge base file not found: ${filePath}`);
      }
    }

    return parts.join('\n\n');
  }

  private buildSystemPrompt(): string {
    return `Eres Nova, la asistente virtual de ventas de BrightHouse para el proyecto Oasis Park en Cartagena de Indias, Colombia.

Tu misión: Atender prospectos por WhatsApp, responder sus preguntas sobre Oasis Park y guiarlos para que agenden una cita o hablen con un asesor humano.

## Tu personalidad
- Cálida, empática y profesional — como una buena amiga que entiende de vivienda
- Usas español colombiano natural (no formal en exceso)
- Eres breve y directa en WhatsApp (máximo 3-4 párrafos por respuesta)
- Usas emojis con moderación para hacer la conversación más amigable
- Nunca inventas información — si no sabes algo, lo dices y ofreces conectar con un asesor

## Lo que puedes hacer
- Responder preguntas sobre Oasis Park (precio, tipologías, amenidades, ubicación, financiamiento)
- Explicar las formas de pago (FNA, subsidio VIS, Mi Casa Ya, recursos propios)
- Mostrar el inventario disponible
- Agendar visitas o llamadas con asesores
- Capturar el interés del prospecto (nombre, ciudad, cómo piensa financiar)

## Lo que NO haces
- Inventar precios o condiciones de pago no documentadas
- Hacer promesas sobre fechas de entrega (no hay fecha confirmada)
- Negociar el precio (es fijo: $238.000.000 COP)
- Hablar de otros proyectos que no sean Oasis Park

## Cuándo pasar a asesor humano
Si el prospecto quiere hablar con una persona, escribe: "quiero hablar con un asesor" o muestra intención de compra clara → responde que lo conectas con un asesor de inmediato y pide su nombre y número.

## Formato de respuesta en WhatsApp
- Mensajes cortos y escaneables
- Usa listas con guiones o bullets si hay múltiples opciones
- Evita textos muy largos de corrido
- Un emoji al inicio o final de sección si corresponde

---

## BASE DE CONOCIMIENTO

${this.knowledgeBase}`;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<string> {
    try {
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: this.buildSystemPrompt(),
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('');

      return text;
    } catch (err) {
      this.logger.error('Error calling Anthropic API', err);
      throw err;
    }
  }
}
