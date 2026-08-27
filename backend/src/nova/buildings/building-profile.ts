/**
 * La ficha de un edificio: todo lo que Nova necesita saber para atender a un
 * prospecto de ese proyecto. Es solo datos — el prompt se arma en
 * `prompt-builder.ts`, y el inventario disponible NO vive aquí: sale de la
 * tabla `units` en cada respuesta.
 */

export interface Typology {
  /** "Tipo A" */
  name: string;
  area_m2: number;
  /** Distribución: "2 alcobas + estudio + 2 baños + sala-comedor + cocina" */
  layout: string;
  /** Qué la diferencia de las demás: "Incluye balcón" */
  highlight: string;
}

export interface PaymentPlan {
  total_price_cop: number;
  applies_vis_subsidy: boolean;
  down_payment_pct: number;
  down_payment_cop: number;
  balance_cop: number;
  monthly_from_cop: number;
  /** Matices del esquema: abonos con primas, cesantías, etc. */
  notes: string;
}

export interface BuildingProfile {
  /** Debe coincidir con el `slug` del tenant en la tabla `tenants`. */
  slug: string;
  building_name: string;
  /** "17 pisos · 127 apartamentos · 8 apartamentos por piso" */
  structure: string;
  location: string;
  /** Por qué la zona importa: valorización, cercanías. */
  location_notes: string;
  delivery: string;
  typologies: Typology[];
  payment: PaymentPlan;
  developers: string;
  /** Fiducia que recibe los pagos. */
  trust: string;
  common_areas: string[];
  sales_room: string;
  agent_hours: string;
  whatsapp_contact: string;
  email_contact: string;
  /** Reglas de tono propias de este edificio, además de las globales. */
  extra_rules: string[];
}

/**
 * Los campos que no pueden quedar vacíos. Un perfil sin precio o sin sala de
 * ventas haría que Nova improvise, que es exactamente lo que no queremos.
 */
export const REQUIRED_PROFILE_FIELDS: Array<keyof BuildingProfile> = [
  'slug',
  'building_name',
  'location',
  'delivery',
  'sales_room',
  'agent_hours',
  'whatsapp_contact',
];
