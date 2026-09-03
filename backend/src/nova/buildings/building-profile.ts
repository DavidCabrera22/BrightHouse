/**
 * La ficha de un edificio: todo lo que Nova necesita saber para atender a un
 * prospecto de ese proyecto. Es solo datos — el prompt se arma en
 * `prompt-builder.ts`, y el inventario disponible NO vive aquí: sale de la
 * tabla `units` en cada respuesta.
 *
 * Un edificio en prelanzamiento no es un edificio en venta con los campos
 * vacíos: es otra cosa. No tiene precio, ni áreas, ni sala de ventas, y el
 * objetivo de la conversación no es agendar una visita sino capturar datos de
 * contacto. Por eso el tipo es una unión discriminada por `stage`: así el
 * compilador impide escribir un perfil a medias, y `prompt-builder` decide qué
 * prompt armar mirando un solo campo.
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

/** Cómo se llama el bot cuando su edificio no le pone otro nombre. */
export const DEFAULT_ASSISTANT_NAME = 'Nova';

interface BuildingBase {
  /** Debe coincidir con el `slug` del tenant en la tabla `tenants`. */
  slug: string;
  building_name: string;
  /**
   * Con qué nombre se presenta el bot en este edificio. Cada comercializadora
   * bautiza al suyo, y el nombre viaja con el edificio y no con el código: por
   * eso vive aquí y no en `prompt-builder`. Sin valor, `DEFAULT_ASSISTANT_NAME`.
   */
  assistant_name?: string;
  location: string;
  /** Por qué la zona importa: valorización, cercanías. */
  location_notes: string;
  /** Reglas de tono propias de este edificio, además de las globales. */
  extra_rules: string[];
}

/** Edificio con información comercial confirmada y unidades a la venta. */
export interface SellingBuilding extends BuildingBase {
  stage: 'selling';
  /** "17 pisos · 127 apartamentos · 8 apartamentos por piso" */
  structure: string;
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
}

/**
 * Edificio anunciado pero sin condiciones comerciales definidas. Nova puede
 * hablar de él, pero no puede comprometer nada: la única información que da es
 * la de `confirmed`, y todo lo demás es "próximamente".
 */
export interface PrelaunchBuilding extends BuildingBase {
  stage: 'prelaunch';
  /**
   * Lo único que está confirmado y Nova puede afirmar. Todo lo que no esté
   * aquí se responde con "se informará oficialmente cuando esté definido".
   */
  confirmed: string[];
  /** Datos a capturar del prospecto, en el orden en que conviene pedirlos. */
  capture: string[];
  /** Preguntas de calificación, para cuando ya entregó sus datos. */
  qualifying_questions: string[];
  /** Vacíos mientras no exista equipo comercial asignado. */
  whatsapp_contact?: string;
  email_contact?: string;
}

export type BuildingProfile = SellingBuilding | PrelaunchBuilding;

/** Campos que un edificio en venta no puede tener vacíos. */
export const REQUIRED_SELLING_FIELDS: Array<keyof SellingBuilding> = [
  'slug',
  'building_name',
  'location',
  'delivery',
  'sales_room',
  'agent_hours',
  'whatsapp_contact',
];

/**
 * Un prelanzamiento necesita mucho menos: sin nombre y ubicación no hay nada
 * que decir, y sin `capture` la conversación no tendría objetivo.
 */
export const REQUIRED_PRELAUNCH_FIELDS: Array<keyof PrelaunchBuilding> = [
  'slug',
  'building_name',
  'location',
];
