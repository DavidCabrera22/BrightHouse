import { Lead } from '../leads/entities/lead.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { businessToday } from '../quotes/quote-status';
import { DayTask } from './entities/day-task.entity';

export type DayKind = 'reply' | 'lead' | 'followup' | 'visit' | 'quote';
export interface DayItem {
  key: string;
  kind: DayKind;
  title: string;
  contact: string;
  project: string;
  reason: string;
  due_at: string;
  priority: number;
  url: string;
  phone?: string;
  lead_id?: string;
  completable: boolean;
}

export interface DaySources {
  leads: Lead[];
  conversations: Conversation[];
  latest: Message[];
  visits: Message[];
  quotes: Quote[];
  tasks: DayTask[];
  contacts: { lead_id: string; last_contact: Date | string }[];
}

// Legacy visit forms store Colombia wall time without an offset.
export function visitDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(
    /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}-05:00`,
  );
  return Number.isFinite(date.getTime()) ? date : null;
}

export function buildDayItems(data: DaySources, now = new Date()): DayItem[] {
  const day = businessToday(now);
  const items: DayItem[] = [];
  const completed = new Set(
    data.tasks.filter((t) => t.completed_at).map((t) => t.source_key),
  );
  const conversations = new Map(data.conversations.map((c) => [c.id, c]));
  const latest = new Map(data.latest.map((m) => [m.conversation_id, m]));
  const contactDates = new Map(
    data.contacts.map((c) => [c.lead_id, new Date(c.last_contact).getTime()]),
  );
  for (const task of data.tasks) {
    if (
      task.completed_at &&
      task.lead_id &&
      ['lead', 'followup'].includes(task.kind)
    ) {
      contactDates.set(
        task.lead_id,
        Math.max(
          contactDates.get(task.lead_id) ?? 0,
          new Date(task.completed_at).getTime(),
        ),
      );
    }
  }
  const pendingLeads = new Set<string>();
  for (const conv of data.conversations) {
    const last = latest.get(conv.id);
    if (
      conv.status !== 'open' ||
      (!conv.needs_human && last?.sender_type !== 'user')
    )
      continue;
    if (conv.lead_id) pendingLeads.add(conv.lead_id);
    items.push({
      key: `reply:${conv.id}:${last?.id ?? 'human'}`,
      kind: 'reply',
      title: conv.needs_human
        ? 'El cliente necesita un asesor'
        : 'Responder al cliente',
      contact: conv.contact_name || conv.lead?.name || 'Contacto',
      project: conv.lead?.project?.name || '',
      reason: conv.needs_human
        ? 'La conversación requiere atención humana.'
        : 'El último mensaje es del cliente y aún no tiene respuesta.',
      due_at: new Date(last?.created_at ?? conv.created_at).toISOString(),
      priority: 0,
      url: `/crm/conversations?conversation=${conv.id}`,
      phone: conv.channel === 'whatsapp' ? conv.contact_phone : undefined,
      lead_id: conv.lead_id,
      completable: false,
    });
  }
  const openTasks = data.tasks.filter(
    (t) =>
      !t.completed_at &&
      t.kind === 'followup' &&
      t.lead &&
      !['won', 'lost'].includes(t.lead.status),
  );
  for (const task of openTasks) {
    items.push({
      key: `task:${task.id}`,
      kind: 'followup',
      title: task.title,
      contact: task.lead.name,
      project: task.lead.project?.name || '',
      reason: 'Seguimiento programado por ti.',
      due_at: new Date(task.due_at).toISOString(),
      priority: 1,
      url: `/crm/leads?lead=${task.lead_id}`,
      phone: task.lead.phone,
      lead_id: task.lead_id,
      completable: true,
    });
  }
  for (const lead of data.leads) {
    if (
      ['won', 'lost'].includes(lead.status) ||
      pendingLeads.has(lead.id) ||
      openTasks.some((t) => t.lead_id === lead.id)
    )
      continue;
    const contact = contactDates.get(lead.id);
    const reference = contact ?? new Date(lead.created_at).getTime();
    const isNew = lead.status === 'new' && !contact;
    const due = isNew ? reference : reference + 3 * 86400_000;
    if (due > now.getTime()) continue;
    items.push({
      key: `lead:${lead.id}:${reference}`,
      kind: 'lead',
      title: isNew ? 'Hacer el primer contacto' : 'Retomar el contacto',
      contact: lead.name,
      project: lead.project?.name || '',
      reason: isNew
        ? 'Lead nuevo sin contacto registrado.'
        : contact
          ? 'Han pasado al menos 3 días desde el último contacto registrado.'
          : 'No hay contacto registrado y el lead lleva al menos 3 días en el CRM.',
      due_at: new Date(due).toISOString(),
      priority: isNew ? 1 : 2,
      url: `/crm/leads?lead=${lead.id}`,
      phone: lead.phone,
      lead_id: lead.id,
      completable: true,
    });
  }
  for (const visit of data.visits) {
    const conv = conversations.get(visit.conversation_id);
    const due = visitDate((visit.metadata as any)?.scheduled_at);
    if (
      !conv ||
      !due ||
      conv.status !== 'open' ||
      ['won', 'lost'].includes(conv.lead?.status)
    )
      continue;
    items.push({
      key: `visit:${visit.id}`,
      kind: 'visit',
      title: 'Visita al proyecto',
      contact: conv.contact_name || conv.lead?.name || 'Contacto',
      project: conv.lead?.project?.name || '',
      reason: 'Visita agendada desde la conversación.',
      due_at: due.toISOString(),
      priority: 1,
      url: `/crm/conversations?conversation=${conv.id}`,
      phone: conv.channel === 'whatsapp' ? conv.contact_phone : undefined,
      completable: true,
    });
  }
  for (const quote of data.quotes) {
    if (quote.status !== 'sent') continue;
    const due = new Date(`${quote.valid_until}T23:59:59-05:00`);
    const sentAgo = now.getTime() - new Date(quote.updated_at).getTime();
    if (quote.valid_until > day && sentAgo < 3 * 86400_000) continue;
    items.push({
      key: `quote:${quote.id}:${new Date(quote.updated_at).getTime()}:${day}`,
      kind: 'quote',
      title: `Revisar cotización ${quote.code}`,
      contact: quote.client?.name || 'Comprador',
      project: quote.project?.name || '',
      reason:
        quote.valid_until < day
          ? 'Cotización vencida sin decisión registrada.'
          : quote.valid_until === day
            ? 'La cotización vence hoy.'
            : 'Cotización enviada hace al menos 3 días sin decisión registrada.',
      due_at: (quote.valid_until <= day
        ? due
        : new Date(new Date(quote.updated_at).getTime() + 3 * 86400_000)
      ).toISOString(),
      priority: 2,
      url: `/crm/projects/${quote.project_id}/quotes?quote=${quote.id}`,
      phone: quote.client?.phone,
      completable: true,
    });
  }
  return items
    .filter((i) => !completed.has(i.key))
    .sort(
      (a, b) => a.priority - b.priority || a.due_at.localeCompare(b.due_at),
    );
}
