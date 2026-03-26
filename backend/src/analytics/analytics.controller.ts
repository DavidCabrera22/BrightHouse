import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

interface AnalyticsSummary {
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  newLeadsThisMonth: number;
  totalUnits: number;
  unitsByStatus: Record<string, number>;
  conversionRate: number;
  topSources: string[];
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  private readonly anthropic: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  @Post('project-insights')
  async generateProjectInsights(@Body() body: { projectName: string; summary: any }) {
    const { projectName, summary } = body;
    const prompt = `Eres un consultor de ventas inmobiliarias experto. Analiza los datos de este proyecto específico y genera recomendaciones accionables en español.

PROYECTO: ${projectName}
DATOS:
- Total unidades: ${summary.totalUnits}
- Disponibles: ${summary.available} (${summary.availPct}%)
- Separadas: ${summary.separated}
- En proceso: ${summary.inProcess}
- Vendidas: ${summary.sold} (${summary.soldPct}%)
- Valor vendido: $${summary.soldValue?.toLocaleString() ?? 0} COP
- Leads del proyecto: ${summary.totalLeads}
- Leads nuevos este mes: ${summary.newLeadsMonth}
- Leads por estado: ${JSON.stringify(summary.leadsByStatus)}
- Tasa de conversión: ${summary.conversionRate?.toFixed(1) ?? 0}%
- Fuentes de leads: ${JSON.stringify(summary.leadsBySource)}

Responde con un JSON con esta estructura exacta (sin texto adicional):
{
  "resumen": "2-3 oraciones describiendo el estado actual del proyecto",
  "insights": [
    { "tipo": "oportunidad|alerta|tendencia", "titulo": "...", "descripcion": "...", "accion": "..." }
  ],
  "recomendacion_principal": "La acción más urgente para maximizar ventas esta semana"
}

Genera 3-4 insights específicos para este proyecto. Sé concreto con los números.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');
      return JSON.parse(text);
    } catch {
      return { resumen: 'No se pudo generar el análisis.', insights: [], recomendacion_principal: 'Intenta de nuevo.' };
    }
  }

  @Post('insights')
  async generateInsights(@Body() summary: AnalyticsSummary) {
    const prompt = `Eres un consultor de ventas inmobiliarias experto. Analiza estos datos del CRM y genera recomendaciones accionables en español.

DATOS DEL CRM:
- Total de leads: ${summary.totalLeads}
- Leads nuevos este mes: ${summary.newLeadsThisMonth}
- Leads por estado: ${JSON.stringify(summary.leadsByStatus)}
- Leads por fuente: ${JSON.stringify(summary.leadsBySource)}
- Total unidades: ${summary.totalUnits}
- Unidades por estado: ${JSON.stringify(summary.unitsByStatus)}
- Tasa de conversión general: ${summary.conversionRate.toFixed(1)}%
- Fuentes principales: ${summary.topSources.join(', ')}

Responde con un JSON con esta estructura exacta (sin texto adicional):
{
  "resumen": "1-2 oraciones describiendo el estado general del negocio",
  "insights": [
    { "tipo": "oportunidad|alerta|tendencia", "titulo": "...", "descripcion": "...", "accion": "..." }
  ],
  "recomendacion_principal": "La recomendación más importante para esta semana"
}

Genera 3-4 insights específicos basados en los datos reales. Si hay pocos datos, menciona qué mejoraría el análisis.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');

      return JSON.parse(text);
    } catch {
      return {
        resumen: 'No se pudo generar el análisis en este momento.',
        insights: [],
        recomendacion_principal: 'Intenta de nuevo más tarde.',
      };
    }
  }
}
