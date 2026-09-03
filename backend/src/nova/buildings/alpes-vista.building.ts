import { PrelaunchBuilding } from './building-profile';

/**
 * Alpes Vista — en etapa de prelanzamiento.
 *
 * Contenido tomado de los mensajes aprobados por el negocio (correo de J.C.,
 * 2026-08-27). La consigna es explícita: manejarlo como "próximamente" o
 * "prelanzamiento", **sin comprometer una fecha específica** ni precios, áreas
 * o condiciones. Nova solo puede afirmar lo que está en `confirmed`.
 *
 * Cuando el proyecto salga a la venta, esto pasa a `stage: 'selling'` con su
 * precio, tipologías, sala de ventas y horarios — y el prompt cambia solo.
 */
export const ALPES_VISTA: PrelaunchBuilding = {
  slug: 'alpes-vista',
  stage: 'prelaunch',
  building_name: 'Alpes Vista',
  assistant_name: 'Sofía',
  location: 'sector Los Alpes, Cartagena',
  location_notes:
    'Un sector consolidado de la ciudad, pensado para quienes sueñan con tener vivienda propia.',

  confirmed: [
    'Es un proyecto de Vivienda de Interés Social (VIS).',
    'Estará ubicado en el sector Los Alpes, en Cartagena.',
    'Se encuentra en etapa de prelanzamiento.',
    'Contará con apartamentos diseñados pensando en la comodidad y el bienestar de las familias, además de espacios para disfrutar en comunidad.',
    'Muy pronto se compartirán los detalles de áreas, distribución, zonas sociales, precios y formas de pago.',
  ],

  capture: [
    'Nombre completo',
    'Número de celular',
    'Correo electrónico',
    '¿Busca vivienda para su familia o como inversión?',
  ],

  qualifying_questions: [
    '¿Buscas tu primera vivienda?',
    '¿Actualmente vives en Cartagena?',
    '¿Comprarías solo(a) o con tu pareja o familia?',
    '¿Te gustaría recibir información sobre subsidios y alternativas para adquirir vivienda VIS?',
  ],

  extra_rules: [
    'NUNCA des una fecha de lanzamiento, ni siquiera aproximada ni por mes o trimestre. Si insisten: "estamos ultimando los detalles y muy pronto anunciaremos oficialmente la fecha".',
    'NUNCA menciones precios, cuotas iniciales, áreas en metros cuadrados, número de apartamentos, pisos, ni formas de pago. Todavía no están definidos.',
    'NUNCA compares Alpes Vista con otros proyectos ni des cifras de otro edificio.',
    'Si preguntan algo que no está en la información confirmada, responde que se informará oficialmente cuando esté definido, y ofrece registrar sus datos.',
    'No hay sala de ventas ni horarios de atención comercial todavía: no invites a visitar ni propongas citas.',
  ],
};
