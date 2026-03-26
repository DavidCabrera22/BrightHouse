import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

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
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  create(createLeadDto: CreateLeadDto) {
    const lead = this.leadRepository.create(createLeadDto);
    lead.ai_score = calculateScore(lead);
    return this.leadRepository.save(lead);
  }

  findAll() {
    return this.leadRepository.find({ relations: ['project', 'assigned_agent'] });
  }

  async findOne(id: string) {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['project', 'assigned_agent'],
    });
    if (!lead) throw new NotFoundException(`Lead ${id} no encontrado`);
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    Object.assign(lead, updateLeadDto);
    // Recalculate score whenever lead data changes
    lead.ai_score = calculateScore(lead);
    return this.leadRepository.save(lead);
  }

  async remove(id: string) {
    const lead = await this.findOne(id);
    return this.leadRepository.remove(lead);
  }

  // ─── AI Suggestion ───────────────────────────────────────────────────────────
  async getSuggestion(id: string): Promise<AiSuggestion> {
    const lead = await this.findOne(id);

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
  async recalculateAllScores(): Promise<number> {
    const leads = await this.leadRepository.find();
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
  ): Promise<{ lead: Lead; created: boolean }> {
    const existing = await this.leadRepository.findOne({ where: { phone } });
    if (existing) return { lead: existing, created: false };

    const lead = this.leadRepository.create({
      phone,
      name: name || phone,
      project_id: projectId,
      source: 'whatsapp',
      status: 'new',
    });
    lead.ai_score = calculateScore(lead);
    const saved = await this.leadRepository.save(lead);
    return { lead: saved, created: true };
  }

  async updateFromNova(
    id: string,
    data: { name?: string; interested_in?: string; ai_score?: number; priority?: string; status?: string },
  ): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) return;

    const updates: Partial<Lead> = {};
    if (data.name) updates.name = data.name;
    if (data.interested_in) updates.interested_in = data.interested_in;
    if (data.priority) updates.priority = data.priority;

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
    }
  }
}
