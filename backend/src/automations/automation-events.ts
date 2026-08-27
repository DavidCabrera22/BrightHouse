/** Emitted by LeadsService so automations stay decoupled from lead logic. */
export const LEAD_CREATED = 'lead.created';
export const LEAD_STATUS_CHANGED = 'lead.status_changed';

export interface LeadCreatedEvent {
  leadId: string;
}

export interface LeadStatusChangedEvent {
  leadId: string;
  from: string;
  to: string;
}
