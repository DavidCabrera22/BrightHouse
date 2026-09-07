import { buildDayItems, DaySources, visitDate } from './day-items';

const now = new Date('2026-09-08T02:00:00Z'); // Still September 7 in Colombia.
const empty = (): DaySources => ({
  leads: [],
  conversations: [],
  latest: [],
  visits: [],
  quotes: [],
  contacts: [],
  tasks: [],
});
const lead = (values = {}) =>
  ({
    id: 'lead-1',
    name: 'Ana',
    status: 'new',
    created_at: new Date('2026-08-01T15:00:00Z'),
    project: { name: 'Oasis' },
    ...values,
  }) as any;
const conversation = (values = {}) =>
  ({
    id: 'conv-1',
    lead_id: 'lead-1',
    status: 'open',
    contact_name: 'Ana',
    created_at: now,
    ...values,
  }) as any;

describe('Mi día priorities and activity', () => {
  it('uses actual recent contact instead of the lead creation date', () => {
    const data = empty();
    data.leads = [lead()];
    data.contacts = [
      { lead_id: 'lead-1', last_contact: '2026-09-07T15:00:00Z' },
    ];
    expect(buildDayItems(data, now)).toEqual([]);
  });

  it('shows uncontacted leads immediately and excludes closed leads', () => {
    const data = empty();
    data.leads = [
      lead({ created_at: now }),
      lead({ id: 'won', status: 'won' }),
      lead({ id: 'lost', status: 'lost' }),
    ];
    expect(buildDayItems(data, now).map((i) => i.contact)).toEqual(['Ana']);
  });

  it('prioritizes the unanswered conversation without duplicating its lead', () => {
    const data = empty();
    data.leads = [lead()];
    data.conversations = [conversation()];
    data.latest = [
      {
        id: 'message-1',
        conversation_id: 'conv-1',
        sender_type: 'user',
        created_at: now,
      } as any,
    ];
    expect(
      buildDayItems(data, now).map((i) => [i.kind, i.completable]),
    ).toEqual([['reply', false]]);
  });

  it('does not treat unread messages already answered by the bot as unanswered', () => {
    const data = empty();
    data.conversations = [conversation({ unread_count: 4 })];
    data.latest = [
      { conversation_id: 'conv-1', sender_type: 'bot', created_at: now } as any,
    ];
    expect(buildDayItems(data, now)).toEqual([]);
    data.conversations[0].needs_human = true;
    expect(buildDayItems(data, now)[0].kind).toBe('reply');
  });

  it('honors planned followups instead of generating a duplicate idle lead', () => {
    const data = empty();
    data.leads = [lead()];
    data.tasks = [
      {
        id: 'task-1',
        kind: 'followup',
        lead_id: 'lead-1',
        lead: lead(),
        title: 'Llamar',
        due_at: new Date('2026-09-10T15:00:00Z'),
      } as any,
    ];
    expect(buildDayItems(data, now).map((i) => i.kind)).toEqual(['followup']);
  });

  it('registering contact resets the inactivity period', () => {
    const data = empty();
    data.leads = [lead()];
    data.tasks = [
      { kind: 'lead', lead_id: 'lead-1', completed_at: now } as any,
    ];
    expect(buildDayItems(data, now)).toEqual([]);
    expect(
      buildDayItems(data, new Date(now.getTime() + 3 * 86400_000))[0].title,
    ).toBe('Retomar el contacto');
  });

  it('includes legacy visits with Colombia wall time and honors completion', () => {
    const data = empty();
    data.conversations = [conversation()];
    data.visits = [
      {
        id: 'visit-1',
        conversation_id: 'conv-1',
        metadata: { scheduled_at: '2026-09-07T15:00' },
      } as any,
    ];
    expect(buildDayItems(data, now)[0].due_at).toBe('2026-09-07T20:00:00.000Z');
    data.tasks = [{ source_key: 'visit:visit-1', completed_at: now } as any];
    expect(buildDayItems(data, now)).toEqual([]);
  });

  it('ignores invalid legacy dates and preserves explicit offsets', () => {
    expect(visitDate(null)).toBeNull();
    expect(visitDate('invalid')).toBeNull();
    expect(visitDate('2026-09-07T15:00:00Z')?.toISOString()).toBe(
      '2026-09-07T15:00:00.000Z',
    );
  });

  it('keeps quotes valid through Colombia midnight and ignores closed quotes', () => {
    const data = empty();
    const quote = {
      id: 'q',
      code: 'C-1',
      status: 'sent',
      valid_until: '2026-09-07',
      updated_at: now,
      project_id: 'p',
    } as any;
    data.quotes = [quote, { ...quote, id: 'closed', status: 'accepted' }];
    const items = buildDayItems(data, now);
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe('La cotización vence hoy.');
    expect(items[0].url).toBe('/crm/projects/p/quotes?quote=q');
    data.tasks = [{ source_key: items[0].key, completed_at: now } as any];
    expect(buildDayItems(data, now)).toEqual([]);
    expect(
      buildDayItems(data, new Date('2026-09-08T15:00:00Z'))[0].reason,
    ).toContain('vencida');
  });
});
