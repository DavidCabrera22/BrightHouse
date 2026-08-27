import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';
import { Unit } from '../units/entities/unit.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PreviewQuoteDto } from './dto/preview-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { calculateQuote, QuoteCalculation, QuoteCalculationError } from './quote-calculator';
import { assertTransition, businessToday, isEditable, isExpired, QuoteStatus } from './quote-status';

const DEFAULT_VALID_DAYS = 15;
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly dataSource: DataSource,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /** Vista previa: calcula sin escribir nada. */
  async preview(dto: PreviewQuoteDto, ctx: TenantContext): Promise<QuoteCalculation> {
    const unit = await this.loadUnit(dto.unit_id, ctx);
    return this.calculate(dto, unit.price);
  }

  async create(dto: CreateQuoteDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(dto.project_id, ctx);
    // Estas dos no son endurecimiento opcional: el filtro de tenant se apoya en
    // `quote.project_id`, así que sin validar la unidad y el cliente un llamante
    // podría colgar de su propia cotización la unidad de otro tenant y leerla
    // de vuelta por las relaciones.
    await this.tenantScope.assertReference(Unit, dto.unit_id, ctx);
    await this.tenantScope.assertReference(Client, dto.client_id, ctx);

    const unit = await this.loadUnit(dto.unit_id, ctx);
    const client = await this.loadClient(dto.client_id, ctx);

    // Aislamiento entre proyectos del mismo tenant: la unidad y el cliente
    // tienen que ser del proyecto que se está cotizando.
    if (unit.project_id !== dto.project_id) {
      throw new BadRequestException('La unidad no pertenece al proyecto indicado');
    }
    if (client.project_id !== dto.project_id) {
      throw new BadRequestException('El cliente no pertenece al proyecto indicado');
    }

    const quoteDate = dto.quote_date ?? businessToday();
    const calculation = this.calculate({ ...dto, quote_date: quoteDate }, unit.price);

    const saved = await this.saveWithCode(dto.project_id, quoteDate, (code, manager) => {
      const quote = manager.create(Quote, {
        project_id: dto.project_id,
        unit_id: dto.unit_id,
        client_id: dto.client_id,
        agent_id: ctx.userId,
        code,
        status: 'draft',
        quote_date: quoteDate,
        valid_until: addDays(quoteDate, dto.valid_days ?? DEFAULT_VALID_DAYS),
        unit_price: unit.price,
        discount: dto.discount ?? 0,
        total_value: calculation.total_value,
        reservation_amount: dto.reservation_amount ?? 0,
        down_payment_percent: dto.down_payment_percent,
        down_payment_value: calculation.down_payment_value,
        installments_count: dto.installments_count,
        installment_amount: calculation.installment_amount,
        first_installment_date: dto.first_installment_date,
        balance_value: calculation.balance_value,
        notes: dto.notes ?? null,
        installments: calculation.installments.map((i) => manager.create(QuoteInstallment, i)),
      });
      return manager.save(Quote, quote);
    });

    return this.findOne(saved.id, ctx);
  }

  async findAll(ctx: TenantContext, projectId?: string, status?: string) {
    const qb = this.tenantScope
      .scoped(Quote, 'quote', ctx)
      .leftJoinAndSelect('quote.unit', 'unit')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.agent', 'agent')
      .orderBy('quote.created_at', 'DESC');

    if (projectId) {
      qb.andWhere('quote.project_id = :projectId', { projectId });
    }
    if (status) {
      qb.andWhere('quote.status = :status', { status });
    }

    const quotes = await qb.getMany();
    return quotes.map((quote) => this.decorate(quote));
  }

  async findOne(id: string, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    return this.decorate(quote);
  }

  /** La entidad completa (con relaciones y cuotas) que necesita el PDF. */
  async findOneEntity(id: string, ctx: TenantContext): Promise<Quote> {
    return this.scopedOne(id, ctx);
  }

  async update(id: string, dto: UpdateQuoteDto, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);

    if (!isEditable(quote.status as QuoteStatus)) {
      throw new BadRequestException(
        'Solo se puede editar una cotización en borrador. Cree una nueva si cambian las condiciones.',
      );
    }

    await this.tenantScope.assertReference(Unit, dto.unit_id, ctx);
    await this.tenantScope.assertReference(Client, dto.client_id, ctx);

    const unitId = dto.unit_id ?? quote.unit_id;
    const unit = await this.loadUnit(unitId, ctx);

    if (dto.client_id) {
      const client = await this.loadClient(dto.client_id, ctx);
      if (client.project_id !== quote.project_id) {
        throw new BadRequestException('El cliente no pertenece al proyecto de la cotización');
      }
    }
    if (unit.project_id !== quote.project_id) {
      throw new BadRequestException('La unidad no pertenece al proyecto de la cotización');
    }

    const params = {
      unit_id: unitId,
      discount: dto.discount ?? quote.discount,
      reservation_amount: dto.reservation_amount ?? quote.reservation_amount,
      down_payment_percent: dto.down_payment_percent ?? quote.down_payment_percent,
      installments_count: dto.installments_count ?? quote.installments_count,
      first_installment_date: dto.first_installment_date ?? quote.first_installment_date,
      quote_date: dto.quote_date ?? quote.quote_date,
    };
    const calculation = this.calculate(params, unit.price);

    await this.dataSource.transaction(async (manager) => {
      // El cronograma se borra entero y se regenera. No es una de dos opciones:
      // la relación tiene `cascade: ['insert']` y no `orphanedRowAction`, así
      // que reasignar el arreglo dejaría las cuotas viejas colgando en la base
      // sin error visible, y el plan sumaría el doble del total.
      await manager.delete(QuoteInstallment, { quote_id: quote.id });

      Object.assign(quote, {
        unit_id: unitId,
        client_id: dto.client_id ?? quote.client_id,
        unit_price: unit.price,
        discount: params.discount,
        reservation_amount: params.reservation_amount,
        down_payment_percent: params.down_payment_percent,
        installments_count: params.installments_count,
        first_installment_date: params.first_installment_date,
        quote_date: params.quote_date,
        valid_until: dto.valid_days
          ? addDays(params.quote_date, dto.valid_days)
          : quote.valid_until,
        notes: dto.notes ?? quote.notes,
        total_value: calculation.total_value,
        down_payment_value: calculation.down_payment_value,
        installment_amount: calculation.installment_amount,
        balance_value: calculation.balance_value,
        installments: calculation.installments.map((i) => manager.create(QuoteInstallment, i)),
      });

      await manager.save(Quote, quote);
    });

    return this.findOne(id, ctx);
  }

  async changeStatus(id: string, status: QuoteStatus, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    assertTransition(quote.status as QuoteStatus, status);
    quote.status = status;
    await this.quoteRepository.save(quote);
    return this.findOne(id, ctx);
  }

  async remove(id: string, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    // Las cuotas caen por ON DELETE CASCADE.
    return this.quoteRepository.remove(quote);
  }

  // ── Internos ──────────────────────────────────────────────────────────

  private calculate(
    params: {
      discount?: number;
      reservation_amount?: number;
      down_payment_percent: number;
      installments_count: number;
      first_installment_date: string;
      quote_date?: string;
    },
    unitPrice: number,
  ): QuoteCalculation {
    try {
      return calculateQuote({
        unit_price: unitPrice,
        discount: params.discount ?? 0,
        reservation_amount: params.reservation_amount ?? 0,
        down_payment_percent: params.down_payment_percent,
        installments_count: params.installments_count,
        quote_date: params.quote_date ?? businessToday(),
        first_installment_date: params.first_installment_date,
      });
    } catch (error) {
      if (error instanceof QuoteCalculationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Guarda reintentando el consecutivo: dos agentes que graban en el mismo
   * instante calculan el mismo número, y el índice único (project_id, code) es
   * el que decide. Un contador en memoria no serviría con varias instancias.
   */
  private async saveWithCode(
    projectId: string,
    quoteDate: string,
    save: (code: string, manager: EntityManager) => Promise<Quote>,
  ): Promise<Quote> {
    const year = Number(quoteDate.slice(0, 4));

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const code = await this.nextCode(manager, projectId, year);
          return save(code, manager);
        });
      } catch (error: any) {
        // Solo se reintenta el choque del consecutivo. Otra violación de
        // unicidad significa algo distinto y no se arregla repitiendo.
        const isCodeCollision =
          error?.code === UNIQUE_VIOLATION && error?.constraint === 'UQ_quotes_project_code';
        if (!isCodeCollision || attempt === 2) throw error;
      }
    }

    throw new Error('unreachable');
  }

  private async nextCode(manager: EntityManager, projectId: string, year: number): Promise<string> {
    const row = await manager
      .createQueryBuilder(Quote, 'quote')
      .select('COUNT(*)', 'count')
      .where('quote.project_id = :projectId', { projectId })
      .andWhere('EXTRACT(YEAR FROM quote.quote_date) = :year', { year })
      .getRawOne<{ count: string }>();

    return `COT-${year}-${String(Number(row.count) + 1).padStart(4, '0')}`;
  }

  private async scopedOne(id: string, ctx: TenantContext): Promise<Quote> {
    const quote = await this.tenantScope
      .scoped(Quote, 'quote', ctx)
      .leftJoinAndSelect('quote.installments', 'installment')
      .leftJoinAndSelect('quote.unit', 'unit')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.agent', 'agent')
      .leftJoinAndSelect('quote.project', 'project')
      .andWhere('quote.id = :id', { id })
      .orderBy('installment.number', 'ASC')
      .getOne();

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  private async loadUnit(unitId: string, ctx: TenantContext): Promise<Unit> {
    const unit = await this.tenantScope
      .scoped(Unit, 'unit', ctx)
      .andWhere('unit.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }
    return unit;
  }

  private async loadClient(clientId: string, ctx: TenantContext): Promise<Client> {
    const client = await this.tenantScope
      .scoped(Client, 'client', ctx)
      .andWhere('client.id = :clientId', { clientId })
      .getOne();

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
    return client;
  }

  /** `is_expired` se calcula en la respuesta; no existe como columna. */
  private decorate(quote: Quote) {
    return {
      ...quote,
      is_expired: isExpired(quote.status as QuoteStatus, quote.valid_until),
    };
  }
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
