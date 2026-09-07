import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { Lead } from '../leads/entities/lead.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { businessToday } from '../quotes/quote-status';
import { DayTask } from './entities/day-task.entity';
import { CreateDayTaskDto } from './my-day.dto';
import { buildDayItems } from './day-items';

@Injectable()
export class MyDayService {
  constructor(
    private readonly scope: TenantScopeService,
    @InjectRepository(DayTask) private readonly tasks: Repository<DayTask>,
  ) {}

  // Personal ownership applies to every role, including administrators.
  private ownLeads(ctx: TenantContext) {
    return this.scope
      .scoped(Lead, 'lead', ctx)
      .andWhere('lead.assigned_agent_id = :owner', { owner: ctx.userId });
  }

  private ownTasks(ctx: TenantContext) {
    return this.scope
      .scoped(DayTask, 'task', ctx)
      .andWhere('task.owner_id = :owner', { owner: ctx.userId });
  }

  async list(ctx: TenantContext, now = new Date()) {
    const [leads, conversations, quotes] = await Promise.all([
      this.ownLeads(ctx).leftJoinAndSelect('lead.project', 'project').getMany(),
      this.scope
        .scoped(Conversation, 'conversation', ctx)
        .leftJoinAndSelect('conversation.lead', 'lead')
        .leftJoinAndSelect('lead.project', 'project')
        .andWhere(
          '(conversation.assigned_agent_id = :owner OR (conversation.assigned_agent_id IS NULL AND lead.assigned_agent_id = :owner))',
          { owner: ctx.userId },
        )
        .getMany(),
      this.scope
        .scoped(Quote, 'quote', ctx)
        .leftJoinAndSelect('quote.client', 'client')
        .leftJoinAndSelect('quote.project', 'project')
        .andWhere('quote.agent_id = :owner', { owner: ctx.userId })
        .andWhere('quote.status = :status', { status: 'sent' })
        .getMany(),
    ]);
    const conversationIds = conversations.map((c) => c.id);
    const leadIds = leads.map((l) => l.id);
    const [latest, visits, contacts, tasks] = await Promise.all([
      conversationIds.length
        ? this.scope
            .scoped(Message, 'message', ctx)
            .andWhere('message.conversation_id IN (:...ids)', {
              ids: conversationIds,
            })
            .andWhere('message.sender_type IN (:...senders)', {
              senders: ['user', 'agent', 'bot'],
            })
            .distinctOn(['message.conversation_id'])
            .orderBy('message.conversation_id')
            .addOrderBy('message.created_at', 'DESC')
            .addOrderBy('message.id', 'DESC')
            .getMany()
        : [],
      conversationIds.length
        ? this.scope
            .scoped(Message, 'message', ctx)
            .andWhere('message.conversation_id IN (:...ids)', {
              ids: conversationIds,
            })
            .andWhere(
              "message.sender_type = 'note' AND message.metadata->>'type' = 'visit'",
            )
            .getMany()
        : [],
      leadIds.length
        ? this.scope
            .scoped(Message, 'message', ctx)
            .innerJoin('message.conversation', 'conversation')
            .andWhere('conversation.lead_id IN (:...ids)', { ids: leadIds })
            .andWhere('message.sender_type IN (:...senders)', {
              senders: ['user', 'agent', 'bot'],
            })
            .select('conversation.lead_id', 'lead_id')
            .addSelect('MAX(message.created_at)', 'last_contact')
            .groupBy('conversation.lead_id')
            .getRawMany<{ lead_id: string; last_contact: Date }>()
        : [],
      this.ownTasks(ctx)
        .leftJoinAndSelect('task.lead', 'lead')
        .leftJoinAndSelect('lead.project', 'project')
        .andWhere(
          leadIds.length
            ? '(task.lead_id IS NULL OR task.lead_id IN (:...ids))'
            : 'task.lead_id IS NULL',
          { ids: leadIds },
        )
        .getMany(),
    ]);
    const items = buildDayItems(
      { leads, conversations, quotes, latest, visits, contacts, tasks },
      now,
    );
    const today = businessToday(now);
    return {
      today,
      time_zone: 'America/Bogota',
      generated_at: now.toISOString(),
      items,
      completed_today: tasks.filter(
        (t) =>
          t.completed_at && businessToday(new Date(t.completed_at)) === today,
      ).length,
      leads: leads
        .filter((l) => !['won', 'lost'].includes(l.status))
        .map((l) => ({
          id: l.id,
          name: l.name,
          project: l.project?.name || '',
        })),
    };
  }

  async create(dto: CreateDayTaskDto, ctx: TenantContext) {
    const lead = await this.ownLeads(ctx)
      .andWhere('lead.id = :id', { id: dto.lead_id })
      .getOne();
    if (!lead) throw new NotFoundException('Lead no encontrado en tu cartera');
    if (['won', 'lost'].includes(lead.status))
      throw new BadRequestException('El lead ya está cerrado');
    const due = new Date(dto.due_at);
    if (!Number.isFinite(due.getTime()) || due.getTime() <= Date.now()) {
      throw new BadRequestException(
        'El seguimiento debe tener una fecha futura',
      );
    }
    return this.tasks.save(
      this.tasks.create({
        owner_id: ctx.userId,
        lead_id: lead.id,
        title: dto.title.trim(),
        kind: 'followup',
        due_at: due,
        completed_at: null,
        source_key: null,
      }),
    );
  }

  async complete(key: string, ctx: TenantContext) {
    const source = key.startsWith('task:') ? key.slice(5) : null;
    // A repeated request is harmless. Never accept another user's task/key.
    const existing = await this.ownTasks(ctx)
      .andWhere(
        source ? 'CAST(task.id AS text) = :key' : 'task.source_key = :key',
        { key: source ?? key },
      )
      .getOne();
    if (existing?.completed_at) return { completed: true };
    const day = await this.list(ctx);
    const item = day.items.find((i) => i.key === key);
    if (!item)
      throw new NotFoundException(
        'El pendiente ya cambió o no pertenece a tu día',
      );
    if (!item.completable)
      throw new BadRequestException(
        'Responde desde la conversación para atender este pendiente',
      );
    const completedAt = new Date();
    if (source && existing) {
      await this.tasks
        .createQueryBuilder()
        .update(DayTask)
        .set({ completed_at: completedAt })
        .where('id = :id AND owner_id = :owner AND completed_at IS NULL', {
          id: existing.id,
          owner: ctx.userId,
        })
        .execute();
    } else {
      await this.tasks
        .createQueryBuilder()
        .insert()
        .into(DayTask)
        .values({
          owner_id: ctx.userId,
          source_key: key,
          kind: item.kind,
          lead_id: item.kind === 'lead' ? item.lead_id : null,
          title: item.title.slice(0, 160),
          due_at: new Date(item.due_at),
          completed_at: completedAt,
        })
        .orIgnore()
        .execute();
    }
    return { completed: true };
  }
}
