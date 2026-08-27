export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Installment {
  number: number;
  concept: 'separacion' | 'cuota' | 'saldo';
  amount: number;
  due_date: string;
}

export interface Quote {
  id: string;
  code: string;
  status: QuoteStatus;
  is_expired: boolean;
  quote_date: string;
  valid_until: string;
  unit_price: number;
  discount: number;
  total_value: number;
  reservation_amount: number;
  down_payment_percent: number;
  down_payment_value: number;
  installments_count: number;
  installment_amount: number;
  first_installment_date: string;
  balance_value: number;
  notes?: string | null;
  installments?: Installment[];
  unit?: {
    id: string;
    code: string;
    tower?: string;
    floor?: string;
    area?: number;
    unit_type?: string;
  };
  client?: {
    id: string;
    name: string;
    document_number: string;
    phone?: string;
    email?: string;
  };
  agent?: { id: string; name: string };
}

export interface QuoteCalculation {
  total_value: number;
  down_payment_value: number;
  balance_value: number;
  installment_amount: number;
  installments: Installment[];
}

export const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const CONCEPT_LABEL: Record<Installment['concept'], string> = {
  separacion: 'Separación',
  cuota: 'Cuota inicial',
  saldo: 'Saldo crédito',
};

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

export const STATUS_CLASS: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});
