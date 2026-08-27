import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { User } from '../users/entities/user.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation)
    private readonly automationRepository: Repository<Automation>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(dto: CreateAutomationDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(dto.project_id, ctx);
    await this.assertActionTargets(dto, ctx);
    const automation = this.automationRepository.create(dto as any);
    return this.automationRepository.save(automation);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Automation, 'automation', ctx)
      .leftJoinAndSelect('automation.project', 'project')
      .orderBy('automation.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const automation = await this.tenantScope
      .scoped(Automation, 'automation', ctx)
      .leftJoinAndSelect('automation.project', 'project')
      .andWhere('automation.id = :id', { id })
      .getOne();

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }
    return automation;
  }

  async update(id: string, dto: UpdateAutomationDto, ctx: TenantContext) {
    const automation = await this.findOne(id, ctx);
    await this.tenantScope.assertProjectInTenant(dto.project_id, ctx);
    await this.assertActionTargets(dto, ctx);
    Object.assign(automation, dto);
    return this.automationRepository.save(automation);
  }

  async remove(id: string, ctx: TenantContext) {
    const automation = await this.findOne(id, ctx);
    return this.automationRepository.remove(automation);
  }

  /** Convenience toggle used by the card controls in the UI. */
  async setStatus(id: string, status: string, ctx: TenantContext) {
    const automation = await this.findOne(id, ctx);
    automation.status = status as Automation['status'];
    return this.automationRepository.save(automation);
  }

  /**
   * An action can name another row by id (the agent to assign). Without this
   * an automation could be pointed at a user from another tenant.
   */
  private async assertActionTargets(
    dto: CreateAutomationDto | UpdateAutomationDto,
    ctx: TenantContext,
  ) {
    if (dto.action_type === 'assign_agent') {
      await this.tenantScope.assertReference(User, dto.action_config?.agent_id, ctx);
    }
  }

  // ── Used by the runner, which resolves its own scope ──────────────────────

  /** Active automations for one trigger, across all tenants. */
  findActiveByTrigger(triggerType: string) {
    return this.automationRepository.find({
      where: { status: 'active', trigger_type: triggerType as any },
      relations: ['project'],
    });
  }

  async recordRun(id: string, error?: string) {
    await this.automationRepository.update(id, {
      runs_count: () => 'runs_count + 1',
      last_run_at: new Date(),
      last_error: error ?? null,
    } as any);
  }
}
