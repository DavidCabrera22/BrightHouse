import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { Lead } from '../leads/entities/lead.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { DayTask } from './entities/day-task.entity';
import { MyDayService } from './my-day.service';

const ctx: TenantContext = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'Agent',
  isSuperAdmin: false,
};

describe('Mi día access and queries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = new DataSource({
      type: 'postgres',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    });
    await (source as any).buildMetadatas();
  });

  it.each(['Agent', 'Admin', 'SuperAdmin'])(
    'scopes each source by owner for %s and ignores notes when finding the latest contact',
    async (role) => {
      const context = { ...ctx, role, isSuperAdmin: role === 'SuperAdmin' };
      const realScope = new TenantScopeService(source);
      const queries: { entity: Function; qb: any }[] = [];
      const scope = {
        scoped: jest.fn((entity, alias, tenant) => {
          const qb = realScope.scoped(entity, alias, tenant);
          const rows =
            entity === Lead
              ? [{ id: 'lead-1', status: 'won' }]
              : entity === Conversation
                ? [{ id: 'conv-1', status: 'closed' }]
                : [];
          qb.getMany = jest.fn().mockResolvedValue(rows);
          qb.getRawMany = jest.fn().mockResolvedValue([]);
          queries.push({ entity, qb });
          return qb;
        }),
      };
      await new MyDayService(scope as any, {} as any).list(context);
      for (const entity of [Lead, Conversation, Quote, DayTask]) {
        const query = queries.find((q) => q.entity === entity)!.qb;
        expect(query.getParameters().owner).toBe(ctx.userId);
        if (!context.isSuperAdmin)
          expect(query.getParameters().__tenantId).toBe(ctx.tenantId);
      }
      const messageQueries = queries.filter((q) => q.entity === Message);
      const last = messageQueries.find((q) =>
        q.qb.getQuery().includes('DISTINCT ON'),
      )!.qb;
      expect(last.getParameters().senders).toEqual(['user', 'agent', 'bot']);
      expect(last.getParameters().ids).toEqual(['conv-1']);
      expect(
        messageQueries
          .find((q) => q.qb.getQuery().includes('MAX('))!
          .qb.getParameters().ids,
      ).toEqual(['lead-1']);
    },
  );

  function setup(existing: any = null) {
    const qb: any = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(existing),
    };
    const repository = {
      save: jest.fn(),
      create: jest.fn((v) => v),
      createQueryBuilder: jest.fn(),
    };
    const scope = { scoped: jest.fn().mockReturnValue(qb) };
    return {
      qb,
      repository,
      service: new MyDayService(scope as any, repository as any),
    };
  }

  it('rejects a followup for a lead outside the caller portfolio without writing', async () => {
    const { service, repository, qb } = setup();
    await expect(
      service.create(
        {
          lead_id: 'other-lead',
          title: 'Contactar',
          due_at: '2030-01-01T15:00:00Z',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      'lead.assigned_agent_id = :owner',
      { owner: 'user-1' },
    );
  });

  it('rejects past dates and closed leads', async () => {
    const { service } = setup({ id: 'lead-1', status: 'new' });
    await expect(
      service.create(
        {
          lead_id: 'lead-1',
          title: 'Contactar',
          due_at: '2020-01-01T15:00:00Z',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const closed = setup({ id: 'lead-1', status: 'won' });
    await expect(
      closed.service.create(
        {
          lead_id: 'lead-1',
          title: 'Contactar',
          due_at: '2030-01-01T15:00:00Z',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not let the caller complete an item absent from their current day', async () => {
    const { service, repository } = setup();
    jest.spyOn(service, 'list').mockResolvedValue({ items: [] } as any);
    await expect(
      service.complete('visit:foreign-id', ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('does not dismiss unanswered messages without a delivered reply', async () => {
    const { service } = setup();
    jest
      .spyOn(service, 'list')
      .mockResolvedValue({
        items: [{ key: 'reply:1', completable: false }],
      } as any);
    await expect(service.complete('reply:1', ctx)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('makes completion retries idempotent', async () => {
    const { service, repository } = setup({ completed_at: new Date() });
    await expect(service.complete('task:already-done', ctx)).resolves.toEqual({
      completed: true,
    });
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
