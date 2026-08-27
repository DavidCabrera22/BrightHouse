import { BuildingProfile } from './building-profile';

/**
 * PENDIENTE: faltan los datos del negocio. Mientras los campos obligatorios
 * estén vacíos, `getBuildingProfile('alpes-vista')` lanza y Nova no responde a
 * ese tenant — a propósito: es preferible el silencio a que le cotice a un
 * prospecto el precio del edificio equivocado.
 *
 * Al llenarlo, invertir la última prueba de `building-registry.spec.ts`.
 */
export const ALPES_VISTA: BuildingProfile = {
  slug: 'alpes-vista',
  building_name: 'Alpes Vista',
  structure: '',
  location: '',
  location_notes: '',
  delivery: '',
  typologies: [],
  payment: {
    total_price_cop: 0,
    applies_vis_subsidy: false,
    down_payment_pct: 0,
    down_payment_cop: 0,
    balance_cop: 0,
    monthly_from_cop: 0,
    notes: '',
  },
  developers: '',
  trust: '',
  common_areas: [],
  sales_room: '',
  agent_hours: '',
  whatsapp_contact: '',
  email_contact: '',
  extra_rules: [],
};
