import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../units/entities/unit.entity';

/** El estado que cuenta como vendible. Sale del seed de `unit_statuses`. */
const AVAILABLE_STATUS = 'Disponible';

/**
 * Un mensaje de WhatsApp no justifica una consulta a Supabase por turno, y 5
 * minutos de desfase en el conteo no cambian ninguna respuesta.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  summary: string | null;
  expiresAt: number;
}

@Injectable()
export class InventorySummaryService {
  private readonly logger = new Logger(InventorySummaryService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  /**
   * Resumen agregado de las unidades disponibles del proyecto. Devuelve `null`
   * si no hay proyecto, si no hay disponibles o si la consulta falla — el
   * llamador arma el prompt igual y remite la disponibilidad al asesor.
   *
   * Es una ruta de sistema: el webhook ya resolvió el tenant del payload y el
   * `projectId` viene del `default_project_id` del tenant, nunca del cliente.
   */
  async getSummary(projectId?: string): Promise<string | null> {
    if (!projectId) return null;

    const cached = this.cache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) return cached.summary;

    let summary: string | null = null;
    try {
      const units = await this.unitRepo.find({
        where: {
          project_id: projectId,
          current_status: { name: AVAILABLE_STATUS },
        },
        relations: ['current_status'],
      });
      summary = this.format(units);
    } catch (err) {
      this.logger.warn(
        `No se pudo consultar el inventario del proyecto ${projectId}: ${err?.message}`,
      );
      return null; // sin cachear: un fallo transitorio no debe durar 5 minutos
    }

    this.cache.set(projectId, {
      summary,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return summary;
  }

  /** Resumen agregado, no listado crudo: 127 unidades en cada prompt no aportan. */
  private format(units: Unit[]): string | null {
    if (units.length === 0) return null;

    const byType = new Map<string, Unit[]>();
    for (const u of units) {
      const key = u.unit_type || 'Sin tipología';
      const bucket = byType.get(key) ?? [];
      bucket.push(u);
      byType.set(key, bucket);
    }

    const lines = [`Total disponibles: ${units.length} unidades.`];

    for (const [type, group] of byType) {
      // `area` y `price` son `decimal`: el driver pg los entrega como cadena.
      const areas = group.map((u) => Number(u.area));
      const prices = group.map((u) => Number(u.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceText =
        minPrice === maxPrice
          ? this.cop(minPrice)
          : `${this.cop(minPrice)} a ${this.cop(maxPrice)}`;

      lines.push(
        `- ${type}: ${group.length} disponibles, ${Math.min(...areas)}–${Math.max(...areas)} m², ${priceText}.`,
      );
    }

    const floors = [...new Set(units.map((u) => u.floor))]
      .sort((a, b) => Number(a) - Number(b))
      .join(', ');
    lines.push(`Pisos con disponibilidad: ${floors}.`);

    return lines.join('\n');
  }

  private cop(value: number): string {
    return '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
}
