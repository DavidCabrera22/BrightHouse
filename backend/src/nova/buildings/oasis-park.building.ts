import { SellingBuilding } from './building-profile';

export const OASIS_PARK: SellingBuilding = {
  slug: 'oasis-park',
  stage: 'selling',
  building_name: 'Oasis Park',
  structure: '17 pisos · 127 apartamentos · 8 apartamentos por piso',
  location:
    'Barrio Providencia, Cartagena de Indias (cerca al ARA)',
  location_notes:
    'Rápida movilidad hacia centros comerciales, colegios, entretenimiento y salud. Zona de alta valorización: estrato 2 con entorno de estrato 4.',
  delivery: 'Entrega año 2027',
  typologies: [
    {
      name: 'Tipo A',
      area_m2: 60,
      layout:
        '2 alcobas + estudio + 2 baños + sala-comedor + cocina + balcón + área de labores',
      highlight:
        'Incluye balcón. El estudio puede servir como 3ra habitación, oficina o cuarto de bebé.',
    },
    {
      name: 'Tipo B',
      area_m2: 65,
      layout:
        '2 alcobas + estudio + 2 baños + sala-comedor + cocina + área de labores',
      highlight:
        'Mayor área interna que el Tipo A, sin balcón. El estudio puede servir como 3ra habitación, oficina o cuarto de bebé.',
    },
  ],
  payment: {
    total_price_cop: 238_000_000,
    applies_vis_subsidy: true,
    down_payment_pct: 20,
    down_payment_cop: 47_600_000,
    balance_cop: 190_400_000,
    monthly_from_cop: 1_400_000,
    notes:
      'El saldo se cubre con crédito hipotecario más subsidios del gobierno y cajas de compensación. La cuota mensual puede reducirse con abonos extras en meses de primas, cesantías o cualquier pago adicional. Con el respaldo de Alianza Fiduciaria la inversión está 100% protegida.',
  },
  developers: 'CIN Constructores + MR Constructores',
  trust:
    'Alianza Fiduciaria (todos los pagos pasan por aquí — protege al comprador)',
  common_areas: [
    'Salón social',
    'Gimnasio al aire libre',
    'Parque infantil',
    'Piscina adultos y niños',
    'Parqueaderos comunales',
    '2 ascensores',
    'Planta eléctrica para áreas comunes',
  ],
  sales_room: 'Centro Comercial Santa Lucía, Local 13, Cartagena',
  agent_hours: 'Lunes a Viernes 8:00am–7:00pm, Sábados 9:00am–2:00pm',
  whatsapp_contact: '+57 315 535 8659',
  email_contact: 'ventas@oasispark.com.co',
  extra_rules: [
    'NUNCA preguntes por el presupuesto — el precio es fijo y único: $238.000.000 COP.',
    'NUNCA preguntes si tiene empleo formal, cesantías o subsidio Mi Casa Ya — esa calificación la hace el asesor.',
    'Los pisos altos (15, 16, 17) tienen mejores vistas y mayor potencial de valorización.',
  ],
};
