import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Automation } from './entities/automation.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AutomationsService } from './automations.service';
import { WhapiService } from '../webhooks/whapi.service';
import {
  LEAD_CREATED,
  LEAD_STATUS_CHANGED,
  LeadCreatedEvent,
  LeadStatusChangedEvent,
} from './automation-events';

/**
 * Evaluates automations and performs their actions.
 *
 * Runs system-side: it reacts to events and to a scheduled scan, with no HTTP
 * caller and therefore no TenantContext. It stays correct because every rule is
 * anchored to a project, and it only ever touches leads belonging to that same
 * project - it never queries across projects.
 */
@Injectable()
export class AutomationsRunner {
  private readonly logger = new Logger(AutomationsRunner.name);

  constructor(
    @InjectRepository(AutomationRun)
    private readonly runRepository: Repository<AutomationRun>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly automationsService: AutomationsService,
    private readonly whapiService: WhapiService,
  ) {}

  @OnEvent(LEAD_CREATED)
  async handleLeadCreated(event: LeadCreatedEvent) {
    const lead = await this.leadRepository.findOne({ where: { id: event.leadId } });
    if (!lead) return;

    const automations = await this.automationsService.findActiveByTrigger('lead_created');
    for (const automation of automations) {
      if (automation.project_id !== lead.project_id) continue;

      const wanted = automation.trigger_config?.source;
      if (wanted && lead.source?.toLowerCase() !== String(wanted).toLowerCase()) continue;

      await this.execute(automation, lead);
    }
  }

  @OnEvent(LEAD_STATUS_CHANGED)
  async handleLeadStatusChanged(event: LeadStatusChangedEvent) {
    const lead = await this.leadRepository.findOne({ where: { id: event.leadId } });
    if (!lead) return;

    const automations = await this.automationsService.findActiveByTrigger('lead_status_changed');
    for (const automation of automations) {
      if (automation.project_id !== lead.project_id) continue;
      if (automation.trigger_config?.to_status !== event.to) continue;

      await this.execute(automation, lead);
    }
  }

  /**
   * Hourly sweep for leads that have gone quiet. The run log's unique
   * (automation, lead) pair keeps this from re-firing on every sweep.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scanIdleLeads() {
    const automations = await this.automationsService.findActiveByTrigger('lead_idle');
    if (automations.length === 0) return;

    for (const automation of automations) {
      const days = Number(automation.trigger_config?.days);
      if (!Number.isFinite(days) || days <= 0) continue;

      const cutoff = new Date(Date.now() - days * 86_400_000);
      const where: Record<string, unknown> = {
        project_id: automation.project_id,
        created_at: LessThan(cutoff),
      };
      if (automation.trigger_config?.status) {
        where.status = automation.trigger_config.status;
      }

      const leads = await this.leadRepository.find({ where: where as any });
      for (const lead of leads) {
        await this.execute(automation, lead);
      }
    }
  }

  /**
   * Claims the (automation, lead) pair first, then acts. The unique constraint
   * makes the claim the idempotency guard, so a lead is never actioned twice
   * even if two sweeps overlap.
   */
  private async execute(automation: Automation, lead: Lead) {
    try {
      await this.runRepository.insert({
        automation_id: automation.id,
        lead_id: lead.id,
        status: 'success',
      });
    } catch {
      // Unique violation: this automation already ran for this lead.
      return;
    }

    try {
      await this.performAction(automation, lead);
      await this.automationsService.recordRun(automation.id);
    } catch (err: any) {
      const message = err?.message ?? 'Error desconocido';
      this.logger.error(`Automation ${automation.id} failed on lead ${lead.id}: ${message}`);
      await this.runRepository.update(
        { automation_id: automation.id, lead_id: lead.id },
        { status: 'failed', detail: message.slice(0, 250) },
      );
      await this.automationsService.recordRun(automation.id, message.slice(0, 250));
    }
  }

  private async performAction(automation: Automation, lead: Lead) {
    switch (automation.action_type) {
      case 'send_whatsapp': {
        const template = automation.action_config?.message;
        if (!template) throw new Error('La automatización no tiene mensaje configurado');
        if (!lead.phone) throw new Error('El lead no tiene teléfono');

        const token = await this.resolveWhapiToken(automation);
        const sent = await this.whapiService.sendText(
          lead.phone,
          this.renderTemplate(template, lead, automation),
          token,
        );
        if (!sent) throw new Error('Whapi rechazó el envío o no hay token configurado');
        break;
      }

      case 'change_lead_status': {
        const status = automation.action_config?.status;
        if (!status) throw new Error('La automatización no tiene estado configurado');
        await this.leadRepository.update(lead.id, { status });
        break;
      }

      case 'assign_agent': {
        const agentId = automation.action_config?.agent_id;
        if (!agentId) throw new Error('La automatización no tiene asesor configurado');
        await this.leadRepository.update(lead.id, { assigned_agent_id: agentId });
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${automation.action_type}`);
    }
  }

  /** Each tenant sends from its own WhatsApp channel; env vars are the fallback. */
  private async resolveWhapiToken(automation: Automation): Promise<string | undefined> {
    const tenantId = automation.project?.tenant_id;
    if (!tenantId) return undefined;
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    return tenant?.whapi_token || undefined;
  }

  private renderTemplate(template: string, lead: Lead, automation: Automation): string {
    return template
      .replace(/\{\{\s*nombre\s*\}\}/gi, lead.name || '')
      .replace(/\{\{\s*proyecto\s*\}\}/gi, automation.project?.name || '')
      .replace(/\{\{\s*interes\s*\}\}/gi, lead.interested_in || '');
  }
}
