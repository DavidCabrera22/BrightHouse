# Nova multi-edificio y control desde WhatsApp — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Nova atienda varios edificios —cada tenant con su propio perfil y su inventario real— y que el asesor pueda silenciarla y recuperarla desde el mismo WhatsApp, sin entrar al CRM.

**Architecture:** El `SYSTEM_PROMPT` constante se parte en dos: un `BuildingProfile` por edificio (archivo TypeScript, resuelto por `tenant.slug`) y un bloque de inventario generado en tiempo real desde la tabla `units`, ensamblados por una función pura `buildSystemPrompt()`. El webhook de WhatsApp deja de descartar los mensajes con `from_me: true` y los usa como señal de que el asesor tomó el control, más un parser de comandos (`#pausa`, `#nova`, `#estado`) y una ventana de reactivación automática. Toda la lógica decidible —ensamblado del prompt, comandos, ventana— vive en funciones puras con pruebas; el controlador solo cablea.

**Tech Stack:** NestJS 10, TypeORM 0.3 (PostgreSQL/Supabase), Jest 29, `@anthropic-ai/sdk` 0.80, React 19 + Vite 7, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-27-nova-multi-edificio-y-control-whatsapp-design.md`

---

## Avisos antes de empezar

**1. `backend/.env` apunta a la misma base de datos que producción.** Lo dice el
CLAUDE.md. La Tarea 7 corre una migración: se corre una sola vez y con
conocimiento de que toca la base real. Nunca activar `DB_SYNCHRONIZE`.

**2. No usar `migration:generate` en este trabajo.** `backend/src/migrations/`
está vacía (solo `.gitkeep`) y el esquema actual se creó con `synchronize`.
`migration:generate` diffea las entidades contra la base viva y, sin migraciones
previas, emitiría un diff de todo el esquema. La migración de la Tarea 7 va
escrita a mano: son tres `ALTER TABLE ... ADD COLUMN`.

**3. `units.area` y `units.price` son `decimal`.** El driver `pg` los devuelve
como cadena, no como número. Todo lo que los sume o compare pasa por `Number()`.
Es el mismo problema que en su momento obligó al `decimalTransformer` del módulo
de cotizaciones.

**4. Los datos de Alpes Vista todavía no están.** La Tarea 3 crea el archivo con
la estructura y campos vacíos, y el registro de perfiles **rechaza** un perfil
incompleto. Nova prefiere no responder antes que inventar un precio. Cuando
lleguen los datos, se llena el archivo y no hay que tocar nada más.

---

## Estructura de archivos

**Backend — crear:**

| Archivo | Responsabilidad |
|---|---|
| `backend/src/nova/buildings/building-profile.ts` | El tipo `BuildingProfile` y sus tipos auxiliares. Sin NestJS, sin base de datos. |
| `backend/src/nova/buildings/oasis-park.building.ts` | El `SYSTEM_PROMPT` actual convertido en datos. |
| `backend/src/nova/buildings/alpes-vista.building.ts` | Perfil de Alpes Vista, con los campos vacíos hasta que lleguen los datos. |
| `backend/src/nova/buildings/building-registry.ts` | `getBuildingProfile(slug)` y la validación de perfil completo. |
| `backend/src/nova/buildings/building-registry.spec.ts` | Pruebas del registro y de la validación. |
| `backend/src/nova/prompt-builder.ts` | `buildSystemPrompt(profile, inventory)`. Función pura. |
| `backend/src/nova/prompt-builder.spec.ts` | Pruebas del ensamblado. |
| `backend/src/nova/chat-history.ts` | El tipo `ChatMessage` y `normalizeHistory()`, que garantiza que el historial empiece por el usuario. Función pura. |
| `backend/src/nova/chat-history.spec.ts` | Pruebas de la normalización. |
| `backend/src/nova/inventory-summary.service.ts` | Resumen de inventario desde `units`, con cache de 5 minutos. |
| `backend/src/nova/nova-commands.ts` | `parseNovaCommand(text)`. Función pura. |
| `backend/src/nova/nova-commands.spec.ts` | Pruebas del parser. |
| `backend/src/nova/nova-pause.ts` | `shouldAutoResume(conv, now, hours)`. Función pura. |
| `backend/src/nova/nova-pause.spec.ts` | Pruebas de la ventana de reactivación. |
| `backend/src/migrations/1756339200000-AddNovaControlFields.ts` | Las tres columnas nuevas de `conversations`. |

**Backend — modificar:**

| Archivo | Cambio |
|---|---|
| `backend/src/nova/nova.service.ts` | Recibe contexto de edificio, arma el prompt, `max_tokens: 400`, extrae `needs_human`. Se elimina `SYSTEM_PROMPT`. |
| `backend/src/nova/nova.module.ts` | Registrar `InventorySummaryService` y el repositorio de `Unit`. |
| `backend/src/conversations/entities/conversation.entity.ts` | `nova_paused_at`, `nova_paused_by`, `needs_human`. |
| `backend/src/conversations/conversations.service.ts` | `pauseNova`, `resumeNova`, `markNeedsHuman` y sus envoltorios `ForTenant`. |
| `backend/src/conversations/conversations.controller.ts` | Los endpoints de pausa usan los métodos nuevos. |
| `backend/src/webhooks/whapi.service.ts` | `deleteMessage()`. |
| `backend/src/webhooks/whatsapp.controller.ts` | Reestructura del flujo completo. |
| `frontend/src/components/ConversationsPage.tsx` | Origen de la pausa e indicador de "necesita asesor". |

**Sin cambios:** `tenant-paths.ts` y `tenant-scope.spec.ts` no se tocan — este
trabajo no crea entidades nuevas, solo columnas en una tabla ya registrada.

---

## Task 1: El tipo `BuildingProfile`

Sin pruebas propias: es solo un tipo, y las Tareas 2 y 3 lo ejercitan al
construir perfiles reales. Se hace primero porque todo lo demás depende de él.

**Files:**
- Create: `backend/src/nova/buildings/building-profile.ts`

- [ ] **Step 1: Escribir el tipo**

```typescript
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
```

- [ ] **Step 2: Compilar**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/nova/buildings/building-profile.ts
git commit -m "feat(nova): tipo BuildingProfile para el perfil de cada edificio"
```

---

## Task 2: El perfil de Oasis Park

Traslado del `SYSTEM_PROMPT` actual a datos. No se inventa nada: cada valor sale
del texto que hoy está en `nova.service.ts`. El inventario piso por piso **no**
se traslada — lo reemplaza la Tarea 4.

**Files:**
- Create: `backend/src/nova/buildings/oasis-park.building.ts`
- Reference: `backend/src/nova/nova.service.ts:10-120` (el prompt actual)

- [ ] **Step 1: Escribir el perfil**

```typescript
import { BuildingProfile } from './building-profile';

export const OASIS_PARK: BuildingProfile = {
  slug: 'oasis-park',
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
```

- [ ] **Step 2: Compilar**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/nova/buildings/oasis-park.building.ts
git commit -m "feat(nova): perfil de Oasis Park migrado del prompt constante"
```

---

## Task 3: El perfil de Alpes Vista (vacío) y el registro

El archivo se crea con la estructura completa y los campos de texto vacíos. El
registro valida y **rechaza** un perfil incompleto, así que hasta que lleguen los
datos, un tenant de Alpes Vista hace que Nova no responda en vez de responder con
datos falsos. Ese es el comportamiento correcto y está probado.

**Files:**
- Create: `backend/src/nova/buildings/alpes-vista.building.ts`
- Create: `backend/src/nova/buildings/building-registry.ts`
- Test: `backend/src/nova/buildings/building-registry.spec.ts`

- [ ] **Step 1: Escribir las pruebas del registro**

```typescript
import {
  getBuildingProfile,
  IncompleteBuildingProfileError,
  MissingBuildingProfileError,
  assertProfileComplete,
} from './building-registry';
import { BuildingProfile } from './building-profile';
import { OASIS_PARK } from './oasis-park.building';

describe('building-registry', () => {
  it('devuelve el perfil de Oasis Park por su slug', () => {
    expect(getBuildingProfile('oasis-park').building_name).toBe('Oasis Park');
  });

  it('ignora mayúsculas y espacios en el slug', () => {
    expect(getBuildingProfile('  Oasis-Park  ').slug).toBe('oasis-park');
  });

  it('lanza MissingBuildingProfileError si el slug no existe', () => {
    expect(() => getBuildingProfile('no-existe')).toThrow(
      MissingBuildingProfileError,
    );
  });

  it('lanza MissingBuildingProfileError si el slug viene vacío', () => {
    expect(() => getBuildingProfile('')).toThrow(MissingBuildingProfileError);
  });

  it('lanza IncompleteBuildingProfileError si falta un campo obligatorio', () => {
    const incompleto: BuildingProfile = { ...OASIS_PARK, sales_room: '' };
    expect(() => assertProfileComplete(incompleto)).toThrow(
      IncompleteBuildingProfileError,
    );
  });

  it('el mensaje del error nombra el campo que falta', () => {
    const incompleto: BuildingProfile = { ...OASIS_PARK, whatsapp_contact: '  ' };
    expect(() => assertProfileComplete(incompleto)).toThrow(/whatsapp_contact/);
  });

  it('acepta un perfil completo', () => {
    expect(() => assertProfileComplete(OASIS_PARK)).not.toThrow();
  });

  it('el perfil de Alpes Vista todavía está incompleto y por eso se rechaza', () => {
    expect(() => getBuildingProfile('alpes-vista')).toThrow(
      IncompleteBuildingProfileError,
    );
  });
});
```

> Nota para quien llene los datos de Alpes Vista: la última prueba deja de
> reflejar la realidad en ese momento. Hay que invertirla a
> `expect(() => getBuildingProfile('alpes-vista')).not.toThrow()`.

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `cd backend && npx jest src/nova/buildings/building-registry.spec.ts`
Expected: FAIL — `Cannot find module './building-registry'`.

- [ ] **Step 3: Escribir el perfil vacío de Alpes Vista**

```typescript
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
```

- [ ] **Step 4: Escribir el registro**

```typescript
import { BuildingProfile, REQUIRED_PROFILE_FIELDS } from './building-profile';
import { OASIS_PARK } from './oasis-park.building';
import { ALPES_VISTA } from './alpes-vista.building';

/** No hay perfil registrado para ese slug de tenant. */
export class MissingBuildingProfileError extends Error {
  constructor(slug: string) {
    super(`No hay perfil de edificio para el tenant "${slug}"`);
    this.name = 'MissingBuildingProfileError';
  }
}

/** El perfil existe pero le faltan datos del negocio. */
export class IncompleteBuildingProfileError extends Error {
  constructor(slug: string, missing: string[]) {
    super(
      `El perfil "${slug}" está incompleto — faltan: ${missing.join(', ')}`,
    );
    this.name = 'IncompleteBuildingProfileError';
  }
}

const PROFILES: Record<string, BuildingProfile> = {
  [OASIS_PARK.slug]: OASIS_PARK,
  [ALPES_VISTA.slug]: ALPES_VISTA,
};

export function assertProfileComplete(profile: BuildingProfile): void {
  const missing = REQUIRED_PROFILE_FIELDS.filter(
    (field) => String(profile[field] ?? '').trim() === '',
  );
  if (missing.length > 0) {
    throw new IncompleteBuildingProfileError(profile.slug, missing);
  }
}

/**
 * Resuelve el perfil por el slug del tenant. Lanza si no existe o si está
 * incompleto: el llamador debe abstenerse de responder, nunca caer a otro
 * perfil.
 */
export function getBuildingProfile(slug: string): BuildingProfile {
  const key = (slug ?? '').trim().toLowerCase();
  const profile = PROFILES[key];
  if (!profile) throw new MissingBuildingProfileError(slug);
  assertProfileComplete(profile);
  return profile;
}
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `cd backend && npx jest src/nova/buildings/building-registry.spec.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 6: Commit**

```bash
git add backend/src/nova/buildings/alpes-vista.building.ts backend/src/nova/buildings/building-registry.ts backend/src/nova/buildings/building-registry.spec.ts
git commit -m "feat(nova): registro de perfiles por tenant y ficha vacía de Alpes Vista"
```

---

## Task 4: Lo que se le manda al modelo — prompt e historial

Dos funciones puras que preparan la llamada a la API: el ensamblado del system
prompt y la normalización del historial. Aquí viven las reglas **globales** de
comportamiento —formato corto, no repetir, escalamiento— porque son política de
producto, no del edificio.

**Files:**
- Create: `backend/src/nova/prompt-builder.ts`
- Test: `backend/src/nova/prompt-builder.spec.ts`
- Create: `backend/src/nova/chat-history.ts`
- Test: `backend/src/nova/chat-history.spec.ts`

- [ ] **Step 1: Escribir las pruebas**

```typescript
import { buildSystemPrompt } from './prompt-builder';
import { OASIS_PARK } from './buildings/oasis-park.building';

describe('buildSystemPrompt', () => {
  it('incluye el nombre del edificio y la sala de ventas', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('Oasis Park');
    expect(prompt).toContain('Centro Comercial Santa Lucía, Local 13');
  });

  it('formatea el precio en pesos con separadores de miles', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('$238.000.000 COP');
  });

  it('lista cada tipología con su área', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('Tipo A — 60 m²');
    expect(prompt).toContain('Tipo B — 65 m²');
  });

  it('incluye las reglas propias del edificio', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('NUNCA preguntes por el presupuesto');
  });

  it('incluye el bloque de inventario cuando se le pasa', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, '12 unidades disponibles');
    expect(prompt).toContain('12 unidades disponibles');
  });

  it('sin inventario, instruye remitir la disponibilidad al asesor', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/no tienes el inventario/i);
    expect(prompt).not.toMatch(/unidades disponibles/i);
  });

  it('siempre incluye las reglas globales de formato y escalamiento', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/dos párrafos/i);
    expect(prompt).toMatch(/escalar/i);
  });
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `cd backend && npx jest src/nova/prompt-builder.spec.ts`
Expected: FAIL — `Cannot find module './prompt-builder'`.

- [ ] **Step 3: Escribir el ensamblador**

```typescript
import { BuildingProfile } from './buildings/building-profile';

/** $238.000.000 — formato colombiano, punto como separador de miles. */
function cop(value: number): string {
  return '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

/**
 * Reglas que aplican a todos los edificios. Son política de producto: cómo se
 * escribe en WhatsApp y cuándo hay que dejar de insistir y pasar a una persona.
 */
const GLOBAL_RULES = `## Reglas de comportamiento
- SIEMPRE responde en español.
- Sé amigable, cálida y empática.
- Máximo dos párrafos cortos por mensaje. En WhatsApp los bloques largos no se leen.
- NO vuelvas a saludar si la conversación ya tiene mensajes previos.
- NO vuelvas a preguntar un dato que el prospecto ya te dio.
- Haz UNA sola pregunta por mensaje.
- Usa como máximo 1 o 2 emojis por mensaje.
- NUNCA inventes precios, disponibilidades ni datos que no estén aquí.
- Termina con una pregunta o una invitación concreta cuando sea apropiado.

## Cuándo escalar a un asesor humano
Deja de responder y pasa la conversación a una persona cuando:
- El prospecto pregunta por su caso concreto de crédito o su capacidad de endeudamiento.
- Intenta negociar el precio o pide un descuento.
- Presenta una queja o un reclamo.
- Pide explícitamente hablar con un asesor.
- Llevan dos turnos sin que la conversación avance.

Al escalar, cierra con una frase de traspaso —por ejemplo: "Déjame conectarte con
uno de nuestros asesores para que te dé la información exacta de tu caso 😊"— y no
sigas insistiendo con el tema.`;

/**
 * Arma el system prompt de Nova para un edificio.
 *
 * @param inventory Resumen de unidades disponibles, o `null` si no se pudo
 *                  consultar. Nunca es un listado crudo de unidades.
 */
export function buildSystemPrompt(
  profile: BuildingProfile,
  inventory: string | null,
): string {
  const p = profile.payment;

  const typologies = profile.typologies
    .map(
      (t) =>
        `**${t.name} — ${t.area_m2} m²**\n- ${t.layout}\n- ${t.highlight}`,
    )
    .join('\n\n');

  const inventoryBlock = inventory
    ? `## Inventario disponible ahora\n${inventory}`
    : `## Inventario disponible ahora\nAhora mismo no tienes el inventario a la mano. Si te preguntan por unidades concretas, remite la disponibilidad al asesor: "Déjame confirmarte la disponibilidad exacta con un asesor 😊".`;

  const extraRules = profile.extra_rules.length
    ? `\n## Reglas propias de ${profile.building_name}\n` +
      profile.extra_rules.map((r) => `- ${r}`).join('\n')
    : '';

  return `Eres Nova, la asistente virtual de BrightHouse — la plataforma de CRM inmobiliario que impulsa la comercialización del proyecto ${profile.building_name}.

## Tu identidad
- Te llamas Nova.
- Eres la asistente virtual de BrightHouse, no de ${profile.building_name} directamente.
- Si te preguntan de dónde eres o quién te envía: "Soy Nova, asistente virtual de BrightHouse 😊 Te ayudo con todo lo relacionado al proyecto ${profile.building_name}."
- Tu tono es amigable, cálido y empático, como una amiga que sabe mucho de propiedades.
- En momentos clave (urgencia, cierre de visita) puedes ser levemente persuasiva y proactiva.

## Sobre ${profile.building_name}
- Ubicación: ${profile.location}
- ${profile.structure}
- ${profile.delivery}
- Constructores: ${profile.developers}
- Fiducia: ${profile.trust}
- ${profile.location_notes}

## Tipologías
${typologies}

${inventoryBlock}

## Zonas comunes
${profile.common_areas.join(' · ')}

## Esquema de pago
- Precio total: ${cop(p.total_price_cop)} COP${p.applies_vis_subsidy ? ' (aplica subsidio VIS)' : ''}
- Cuota inicial (${p.down_payment_pct}%): ${cop(p.down_payment_cop)} con recursos propios
- Saldo: ${cop(p.balance_cop)}
- Cuotas mensuales desde ${cop(p.monthly_from_cop)} (valor aproximado)
- ${p.notes}

## Contacto y visitas
- Sala de ventas: ${profile.sales_room}
- Horario de asesores: ${profile.agent_hours}
- WhatsApp asesores: ${profile.whatsapp_contact}
- Correo: ${profile.email_contact}

## Tu objetivo principal
Resolver las dudas del prospecto con información real y guiar la conversación
hacia agendar una visita a la sala de ventas. La visita es el paso más
importante. Para agendar, propón algo concreto: "Te propongo una visita rápida de
30 minutos, sin compromiso. ¿Te funciona el jueves o el sábado? ¿Mañana o tarde?"
${extraRules}

${GLOBAL_RULES}`;
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `cd backend && npx jest src/nova/prompt-builder.spec.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: Escribir las pruebas del historial**

La API de Anthropic exige que el primer mensaje sea del `user`. El historial sale
de la tabla `messages`, donde el primer registro puede ser perfectamente de Nova
o del asesor —y a partir de la Tarea 11 los mensajes del asesor también entran al
historial, así que deja de ser un caso raro. Sin esta normalización, la llamada
falla con un 400 y el prospecto recibe el mensaje de error genérico.

```typescript
import { normalizeHistory } from './chat-history';
import { ChatMessage } from './chat-history';

describe('normalizeHistory', () => {
  it('deja intacto un historial que ya empieza con el usuario', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: '¡Hola! ¿En qué te ayudo?' },
    ];
    expect(normalizeHistory(history)).toEqual(history);
  });

  it('descarta los mensajes del asistente que abren el historial', () => {
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'Mensaje de difusión' },
      { role: 'assistant', content: 'Segundo mensaje del asesor' },
      { role: 'user', content: 'Hola, me interesa' },
    ];
    expect(normalizeHistory(history)).toEqual([
      { role: 'user', content: 'Hola, me interesa' },
    ]);
  });

  it('devuelve vacío si el historial es todo del asistente', () => {
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'Buenas, le escribo de Oasis Park' },
    ];
    expect(normalizeHistory(history)).toEqual([]);
  });

  it('devuelve vacío para un historial vacío', () => {
    expect(normalizeHistory([])).toEqual([]);
  });
});
```

- [ ] **Step 6: Correr y verificar que falla**

Run: `cd backend && npx jest src/nova/chat-history.spec.ts`
Expected: FAIL — `Cannot find module './chat-history'`.

- [ ] **Step 7: Escribir la normalización**

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * La API de Anthropic exige que el primer mensaje sea del `user`. El historial
 * viene de la tabla `messages`, que puede empezar con un mensaje de Nova o del
 * asesor —un saludo de difusión, o el asesor escribiendo primero—. Esos
 * mensajes de apertura se descartan.
 */
export function normalizeHistory(history: ChatMessage[]): ChatMessage[] {
  const firstUser = history.findIndex((m) => m.role === 'user');
  return firstUser === -1 ? [] : history.slice(firstUser);
}
```

- [ ] **Step 8: Correr y verificar que pasa**

Run: `cd backend && npx jest src/nova/chat-history.spec.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 9: Commit**

```bash
git add backend/src/nova/prompt-builder.ts backend/src/nova/prompt-builder.spec.ts backend/src/nova/chat-history.ts backend/src/nova/chat-history.spec.ts
git commit -m "feat(nova): ensamblado del prompt por edificio y normalización del historial"
```

---

## Task 5: El resumen de inventario en vivo

Consulta `units` por `project_id`, agrega y cachea. Se prueba con la
verificación de compilación y en el flujo real de la Tarea 13: montar un
`Repository<Unit>` falso para probar un `find` con `relations` da poca señal
frente al ruido, y la lógica de agregación queda cubierta por el uso real.

**Files:**
- Create: `backend/src/nova/inventory-summary.service.ts`

- [ ] **Step 1: Escribir el servicio**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../units/entities/unit.entity';

/** El estado que cuenta como vendible. Sale del seed de `unit_statuses`. */
const AVAILABLE_STATUS = 'Disponible';

/**
 * Un mensaje de WhatsApp no justifica una consulta a Supabase por turno, y 5
 * minutos de desfase en el conteo no cambian ninguna respuesta.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  summary: string | null;
  expiresAt: number;
}

@Injectable()
export class InventorySummaryService {
  private readonly logger = new Logger(InventorySummaryService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  /**
   * Resumen agregado de las unidades disponibles del proyecto. Devuelve `null`
   * si no hay proyecto, si no hay disponibles o si la consulta falla — el
   * llamador arma el prompt igual y remite la disponibilidad al asesor.
   *
   * Es una ruta de sistema: el webhook ya resolvió el tenant del payload y el
   * `projectId` viene del `default_project_id` del tenant, nunca del cliente.
   */
  async getSummary(projectId?: string): Promise<string | null> {
    if (!projectId) return null;

    const cached = this.cache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) return cached.summary;

    let summary: string | null = null;
    try {
      const units = await this.unitRepo.find({
        where: {
          project_id: projectId,
          current_status: { name: AVAILABLE_STATUS },
        },
        relations: ['current_status'],
      });
      summary = this.format(units);
    } catch (err) {
      this.logger.warn(
        `No se pudo consultar el inventario del proyecto ${projectId}: ${err?.message}`,
      );
      return null; // sin cachear: un fallo transitorio no debe durar 5 minutos
    }

    this.cache.set(projectId, {
      summary,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return summary;
  }

  /** Resumen agregado, no listado crudo: 127 unidades en cada prompt no aportan. */
  private format(units: Unit[]): string | null {
    if (units.length === 0) return null;

    // Hoy `unit_type` está en NULL en toda la tabla, así que agrupar solo por
    // él dejaría un único bucket "Sin tipología" sin valor para el prospecto.
    // El área sí distingue las tipologías reales (60 m² vs 65 m²), y sirve de
    // sustituto hasta que las unidades tengan su tipo asignado.
    const byType = new Map<string, Unit[]>();
    for (const u of units) {
      const key = u.unit_type || `${Number(u.area)} m²`;
      const bucket = byType.get(key) ?? [];
      bucket.push(u);
      byType.set(key, bucket);
    }

    const lines = [`Total disponibles: ${units.length} unidades.`];

    for (const [type, group] of byType) {
      // `area` y `price` son `decimal`: el driver pg los entrega como cadena.
      const areas = group.map((u) => Number(u.area));
      const prices = group.map((u) => Number(u.price));
      const minArea = Math.min(...areas);
      const maxArea = Math.max(...areas);
      const areaText =
        minArea === maxArea ? `${minArea} m²` : `${minArea}–${maxArea} m²`;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceText =
        minPrice === maxPrice
          ? this.cop(minPrice)
          : `${this.cop(minPrice)} a ${this.cop(maxPrice)}`;

      // Si el grupo se armó por área, el tipo ya ES el área: no la repitas.
      const label =
        type === areaText ? `Apartamentos de ${areaText}` : `${type}, ${areaText}`;

      lines.push(`- ${label}: ${group.length} disponibles, ${priceText}.`);
    }

    const floors = [...new Set(units.map((u) => u.floor))]
      .sort((a, b) => Number(a) - Number(b))
      .join(', ');
    lines.push(`Pisos con disponibilidad: ${floors}.`);

    return lines.join('\n');
  }

  private cop(value: number): string {
    return '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
}
```

- [ ] **Step 2: Compilar**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/nova/inventory-summary.service.ts
git commit -m "feat(nova): resumen de inventario disponible desde la tabla units"
```

---

## Task 6: `NovaService` con contexto de edificio

**Files:**
- Modify: `backend/src/nova/nova.service.ts` (reemplaza `SYSTEM_PROMPT` completo)
- Modify: `backend/src/nova/nova.module.ts`

- [ ] **Step 1: Reescribir `nova.service.ts`**

Se elimina la constante `SYSTEM_PROMPT` entera (líneas 10–120 del archivo actual).

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt-builder';
import { getBuildingProfile } from './buildings/building-registry';
import { InventorySummaryService } from './inventory-summary.service';
import { ChatMessage, normalizeHistory } from './chat-history';

/** Se reexporta para no romper los imports existentes de los webhooks. */
export type { ChatMessage };

/** De qué edificio habla esta conversación. */
export interface NovaContext {
  /** Slug del tenant; debe tener un perfil en `building-registry`. */
  buildingSlug: string;
  /** Proyecto del que sale el inventario. */
  projectId?: string;
}

const FALLBACK_MESSAGE =
  'Disculpa, no entendí bien tu mensaje. ¿Me puedes contar un poco más sobre lo que buscas? Con gusto te ayudo 😊';
const ERROR_MESSAGE =
  'Ups, tuve un pequeño problema técnico. ¿Puedes repetir tu mensaje? Estoy aquí para ayudarte.';

/**
 * En WhatsApp, 1024 tokens son varias pantallas. Una instrucción de "sé breve"
 * en el prompt es una sugerencia; esto es un techo.
 */
const MAX_TOKENS = 400;

export interface LeadExtraction {
  name?: string;
  interested_in?: string;
  financing?: string;
  priority?: string;
  ai_score?: number;
  /** El modelo detectó que la conversación necesita un asesor humano. */
  needs_human?: boolean;
}

@Injectable()
export class NovaService {
  private readonly logger = new Logger(NovaService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    private readonly inventory: InventorySummaryService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Devuelve la respuesta de Nova, o `null` si no puede responder por el
   * edificio de esta conversación. `null` significa "no mandes nada": es
   * preferible el silencio a responder con los datos de otro proyecto.
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    ctx: NovaContext,
  ): Promise<string | null> {
    if (!userMessage || userMessage.trim().length < 2) {
      return FALLBACK_MESSAGE;
    }

    let systemPrompt: string;
    try {
      const profile = getBuildingProfile(ctx.buildingSlug);
      const inventory = await this.inventory.getSummary(ctx.projectId);
      systemPrompt = buildSystemPrompt(profile, inventory);
    } catch (err) {
      this.logger.error(
        `Sin perfil utilizable para "${ctx.buildingSlug}": ${err?.message}. Nova no responde.`,
      );
      return null;
    }

    try {
      // La API exige que el primer mensaje sea del usuario; el historial de la
      // base puede empezar con Nova o con el asesor.
      const messages: Anthropic.MessageParam[] = [
        ...normalizeHistory(conversationHistory).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('');

      this.logger.log(
        `Nova respondió [${ctx.buildingSlug}] (${response.usage.input_tokens} tokens in / ${response.usage.output_tokens} out)`,
      );

      return text;
    } catch (err) {
      this.logger.error('Error calling Anthropic API', err);
      return ERROR_MESSAGE;
    }
  }

  async extractLeadInfo(
    conversationHistory: ChatMessage[],
  ): Promise<LeadExtraction> {
    if (conversationHistory.length < 2) return {};

    const transcript = conversationHistory
      .map((m) => `${m.role === 'user' ? 'Prospecto' : 'Nova'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `Eres un extractor de datos. Analiza la conversación y responde SOLO con un JSON válido sin texto adicional.
Extrae: nombre real del prospecto (si lo mencionó), propósito (para vivir/invertir), financiamiento (FNA/subsidio/recursos propios/combinación), nivel de interés (ai_score 1-100), prioridad (high/medium/low), y needs_human (true si el prospecto pregunta por su caso concreto de crédito, intenta negociar el precio, presenta una queja, pide hablar con un asesor, o la conversación lleva dos turnos sin avanzar).
Si un campo no está claro, omítelo del JSON.
Ejemplo: {"name":"Carlos","interested_in":"para vivir","financing":"FNA","ai_score":70,"priority":"medium","needs_human":false}`,
        messages: [{ role: 'user', content: `Conversación:\n${transcript}` }],
      });

      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');

      return JSON.parse(raw) as LeadExtraction;
    } catch {
      return {};
    }
  }
}
```

- [ ] **Step 2: Registrar el repositorio en `nova.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovaService } from './nova.service';
import { InventorySummaryService } from './inventory-summary.service';
import { Unit } from '../units/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit])],
  providers: [NovaService, InventorySummaryService],
  exports: [NovaService],
})
export class NovaModule {}
```

- [ ] **Step 3: Compilar**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: **dos errores esperados**, en `whatsapp.controller.ts` e
`instagram.controller.ts`: `generateResponse` ahora exige el tercer argumento.
El de WhatsApp se arregla en la Tarea 10; el de Instagram, en el paso siguiente.

- [ ] **Step 4: Arreglar la llamada de Instagram**

Instagram queda fuera del alcance de este trabajo, pero no puede quedar sin
compilar. Buscar la llamada a `generateResponse` en
`backend/src/webhooks/instagram.controller.ts` y pasarle el contexto, más el
manejo del `null`:

```typescript
const novaReply = await this.novaService.generateResponse(text, history, {
  buildingSlug: 'oasis-park',
  projectId: this.configService.get<string>('DEFAULT_PROJECT_ID'),
});
if (!novaReply) continue;
```

> El slug fijo es deuda consciente: Instagram todavía no resuelve tenant como lo
> hace WhatsApp. Queda anotado en el spec como fuera de alcance.

- [ ] **Step 5: Compilar y correr todas las pruebas**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json && npx jest`
Expected: compilación limpia y todas las pruebas en verde.

- [ ] **Step 6: Commit**

```bash
git add backend/src/nova/nova.service.ts backend/src/nova/nova.module.ts backend/src/webhooks/instagram.controller.ts
git commit -m "feat(nova): prompt por edificio con inventario en vivo y tope de 400 tokens"
```

---

## Task 7: Columnas nuevas y migración

**Files:**
- Modify: `backend/src/conversations/entities/conversation.entity.ts`
- Create: `backend/src/migrations/1756339200000-AddNovaControlFields.ts`

- [ ] **Step 1: Agregar los campos a la entidad**

En `conversation.entity.ts`, justo después de la columna `nova_paused`:

```typescript
  @Column({ default: false })
  nova_paused: boolean; // When true, Nova will not auto-respond

  /** Cuándo se pausó. Base de la ventana de reactivación automática. */
  @Column({ nullable: true, type: 'timestamp' })
  nova_paused_at: Date | null;

  /** Quién pausó: 'whatsapp' | 'crm' | 'nova'. */
  @Column({ nullable: true })
  nova_paused_by: string | null;

  /** Nova pidió escalar. Se apaga cuando un asesor responde. */
  @Column({ default: false })
  needs_human: boolean;
```

- [ ] **Step 2: Escribir la migración a mano**

**No usar `migration:generate`** — ver el aviso 2 al inicio del plan.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNovaControlFields1756339200000 implements MigrationInterface {
  name = 'AddNovaControlFields1756339200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "nova_paused_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "nova_paused_by" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "needs_human" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "needs_human"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "nova_paused_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "nova_paused_at"`,
    );
  }
}
```

- [ ] **Step 3: Ver el estado de las migraciones antes de correr**

Run: `cd backend && npm run migration:show`
Expected: `[ ] AddNovaControlFields1756339200000` — pendiente, y ninguna otra.

Si aparecen más migraciones pendientes, **parar** y avisar: significa que el
directorio ya no está como se documentó y hay que revisar antes de tocar la base.

- [ ] **Step 4: Correr la migración**

Esto escribe en la base de Supabase de producción. Es un `ADD COLUMN` con valor
por defecto: no reescribe filas ni bloquea la tabla.

Run: `cd backend && npm run migration:run`
Expected: `Migration AddNovaControlFields1756339200000 has been executed successfully.`

- [ ] **Step 5: Verificar**

Run: `cd backend && npm run migration:show`
Expected: `[X] AddNovaControlFields1756339200000`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/conversations/entities/conversation.entity.ts backend/src/migrations/1756339200000-AddNovaControlFields.ts
git commit -m "feat(conversations): columnas de control de pausa de Nova"
```

---

## Task 8: El parser de comandos y la ventana de reactivación

Las dos piezas de lógica pura del control desde WhatsApp, con sus pruebas.

**Files:**
- Create: `backend/src/nova/nova-commands.ts`
- Test: `backend/src/nova/nova-commands.spec.ts`
- Create: `backend/src/nova/nova-pause.ts`
- Test: `backend/src/nova/nova-pause.spec.ts`

- [ ] **Step 1: Escribir las pruebas del parser**

```typescript
import { parseNovaCommand } from './nova-commands';

describe('parseNovaCommand', () => {
  it('reconoce #pausa', () => {
    expect(parseNovaCommand('#pausa')).toBe('pause');
  });

  it('reconoce #nova', () => {
    expect(parseNovaCommand('#nova')).toBe('resume');
  });

  it('reconoce #estado', () => {
    expect(parseNovaCommand('#estado')).toBe('status');
  });

  it('ignora mayúsculas y espacios sobrantes', () => {
    expect(parseNovaCommand('  #PAUSA  ')).toBe('pause');
  });

  it('NO reconoce el comando dentro de una frase', () => {
    // El asesor tiene que poder escribirle esto al cliente sin silenciar el bot.
    expect(parseNovaCommand('hago una #pausa y te confirmo')).toBeNull();
  });

  it('no reconoce la palabra sin el numeral', () => {
    expect(parseNovaCommand('pausa')).toBeNull();
  });

  it('devuelve null para texto normal', () => {
    expect(parseNovaCommand('Buenos días, ya le confirmo')).toBeNull();
  });

  it('devuelve null para vacío o indefinido', () => {
    expect(parseNovaCommand('')).toBeNull();
    expect(parseNovaCommand(undefined as unknown as string)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd backend && npx jest src/nova/nova-commands.spec.ts`
Expected: FAIL — `Cannot find module './nova-commands'`.

- [ ] **Step 3: Escribir el parser**

```typescript
/**
 * Comandos que el asesor escribe en el propio chat de WhatsApp, desde el número
 * del negocio. Solo se interpretan en mensajes con `from_me: true`.
 */
export type NovaCommand = 'pause' | 'resume' | 'status';

const COMMANDS: Record<string, NovaCommand> = {
  '#pausa': 'pause',
  '#nova': 'resume',
  '#estado': 'status',
};

/**
 * Devuelve el comando si el mensaje ES el comando, no si lo contiene: el asesor
 * tiene que poder escribir "hago una #pausa y te confirmo" sin silenciar a Nova.
 */
export function parseNovaCommand(text: string): NovaCommand | null {
  if (!text) return null;
  return COMMANDS[text.trim().toLowerCase()] ?? null;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd backend && npx jest src/nova/nova-commands.spec.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 5: Escribir las pruebas de la ventana**

```typescript
import { shouldAutoResume, PauseState } from './nova-pause';

const HOURS = 12;
const AHORA = new Date('2026-08-27T20:00:00Z');

function pausedHoursAgo(hours: number, by: string): PauseState {
  return {
    nova_paused: true,
    nova_paused_at: new Date(AHORA.getTime() - hours * 3600_000),
    nova_paused_by: by,
  };
}

describe('shouldAutoResume', () => {
  it('no reactiva una conversación que no está pausada', () => {
    const conv: PauseState = {
      nova_paused: false,
      nova_paused_at: null,
      nova_paused_by: null,
    };
    expect(shouldAutoResume(conv, AHORA, HOURS)).toBe(false);
  });

  it('no reactiva dentro de la ventana', () => {
    expect(shouldAutoResume(pausedHoursAgo(3, 'whatsapp'), AHORA, HOURS)).toBe(
      false,
    );
  });

  it('reactiva pasada la ventana', () => {
    expect(shouldAutoResume(pausedHoursAgo(13, 'whatsapp'), AHORA, HOURS)).toBe(
      true,
    );
  });

  it('reactiva justo en el límite', () => {
    expect(shouldAutoResume(pausedHoursAgo(12, 'whatsapp'), AHORA, HOURS)).toBe(
      true,
    );
  });

  it('reactiva también las pausadas desde el CRM', () => {
    expect(shouldAutoResume(pausedHoursAgo(20, 'crm'), AHORA, HOURS)).toBe(true);
  });

  it('NUNCA reactiva una conversación escalada por Nova', () => {
    // Reactivarla la devolvería a la situación que la hizo escalar.
    expect(shouldAutoResume(pausedHoursAgo(99, 'nova'), AHORA, HOURS)).toBe(
      false,
    );
  });

  it('no reactiva si la pausa es vieja y no tiene sello de tiempo', () => {
    // Filas pausadas antes de esta migración: las reactiva una persona.
    const conv: PauseState = {
      nova_paused: true,
      nova_paused_at: null,
      nova_paused_by: null,
    };
    expect(shouldAutoResume(conv, AHORA, HOURS)).toBe(false);
  });
});
```

- [ ] **Step 6: Correr y verificar que falla**

Run: `cd backend && npx jest src/nova/nova-pause.spec.ts`
Expected: FAIL — `Cannot find module './nova-pause'`.

- [ ] **Step 7: Escribir la ventana**

```typescript
/** Lo que hace falta de una conversación para decidir la reactivación. */
export interface PauseState {
  nova_paused: boolean;
  nova_paused_at: Date | null;
  nova_paused_by: string | null;
}

export const DEFAULT_RESUME_HOURS = 12;

/**
 * ¿Debe Nova retomar el control de esta conversación?
 *
 * La ventana se mide desde `nova_paused_at`, que se reescribe con cada mensaje
 * del asesor: mientras el asesor esté activo en el chat, Nova no se mete.
 *
 * Una conversación escalada por Nova (`nova_paused_by === 'nova'`) no se
 * reactiva sola nunca: solo con `#nova` o con el botón del CRM.
 */
export function shouldAutoResume(
  conv: PauseState,
  now: Date,
  resumeHours: number,
): boolean {
  if (!conv.nova_paused) return false;
  if (conv.nova_paused_by === 'nova') return false;
  if (!conv.nova_paused_at) return false;

  const elapsedMs = now.getTime() - new Date(conv.nova_paused_at).getTime();
  return elapsedMs >= resumeHours * 3600_000;
}
```

- [ ] **Step 8: Correr y verificar que pasa**

Run: `cd backend && npx jest src/nova/nova-pause.spec.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 9: Commit**

```bash
git add backend/src/nova/nova-commands.ts backend/src/nova/nova-commands.spec.ts backend/src/nova/nova-pause.ts backend/src/nova/nova-pause.spec.ts
git commit -m "feat(nova): parser de comandos del asesor y ventana de reactivación"
```

---

## Task 9: Pausar y reanudar en el servicio de conversaciones

Un solo lugar que sella los campos, para que el CRM y WhatsApp escriban el mismo
estado.

**Files:**
- Modify: `backend/src/conversations/conversations.service.ts`
- Modify: `backend/src/conversations/conversations.controller.ts:76-90`

- [ ] **Step 1: Agregar los métodos al servicio**

En `conversations.service.ts`, después de `markAsRead()` y antes del comentario
`// --- Request-facing wrappers ---`:

```typescript
  /**
   * Silencia a Nova en esta conversación y sella quién y cuándo. El sello de
   * tiempo es la base de la ventana de reactivación automática.
   */
  async pauseNova(
    conversationId: string,
    by: 'whatsapp' | 'crm' | 'nova',
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      nova_paused: true,
      nova_paused_at: new Date(),
      nova_paused_by: by,
      // Un asesor que entra al chat ya está atendiendo: la señal de escalamiento
      // deja de aplicar. Salvo cuando es la propia Nova la que escala.
      ...(by === 'nova' ? { needs_human: true } : { needs_human: false }),
    });
  }

  /** Devuelve el control a Nova y limpia el estado de pausa. */
  async resumeNova(conversationId: string): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      nova_paused: false,
      nova_paused_at: null,
      nova_paused_by: null,
      needs_human: false,
    });
  }
```

- [ ] **Step 2: Agregar los envoltorios `ForTenant`**

Al final de la sección de envoltorios, junto a `updateConversationForTenant`:

```typescript
  async pauseNovaForTenant(id: string, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    await this.pauseNova(id, 'crm');
    return this.findConversationById(id);
  }

  async resumeNovaForTenant(id: string, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    await this.resumeNova(id);
    return this.findConversationById(id);
  }
```

- [ ] **Step 3: Apuntar los endpoints a los métodos nuevos**

En `conversations.controller.ts`, reemplazar los cuerpos de `pauseNova` y
`resumeNova`:

```typescript
  @Patch(':id/pause-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Pause Nova for this conversation (agent takes control)' })
  pauseNova(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.pauseNovaForTenant(id, tenant);
  }

  @Patch(':id/resume-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Resume Nova for this conversation' })
  resumeNova(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.resumeNovaForTenant(id, tenant);
  }
```

- [ ] **Step 4: Compilar y correr las pruebas**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json && npx jest`
Expected: compilación limpia, todas las pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add backend/src/conversations/conversations.service.ts backend/src/conversations/conversations.controller.ts
git commit -m "feat(conversations): pausar y reanudar Nova sellando origen y momento"
```

---

## Task 10: Borrado de mensajes en Whapi

**Files:**
- Modify: `backend/src/webhooks/whapi.service.ts`

- [ ] **Step 1: Verificar el endpoint contra la documentación de Whapi**

Antes de escribir: confirmar en la documentación de Whapi (o en el panel de la
cuenta) la ruta de borrado de un mensaje propio y que el plan contratado la
incluye. El código de abajo asume `DELETE /messages/{messageId}`.

Si el plan no lo permite: **no** inventar otro canal de control. Dejar
`deleteMessage` devolviendo `false` con un log claro, y anotar en el spec que los
comandos quedan visibles para el cliente. El resto del plan funciona igual — el
comando nunca se guarda como mensaje de la conversación en el CRM.

- [ ] **Step 2: Agregar el método**

Después de `sendText()`:

```typescript
  /**
   * Borra un mensaje propio del chat. Se usa para que el comando del asesor
   * (`#pausa`, `#nova`) no le quede visible al cliente.
   *
   * Un fallo aquí no es grave: el comando ya surtió efecto, lo único que se
   * pierde es que el cliente lo vea.
   */
  async deleteMessage(messageId: string, tokenOverride?: string): Promise<boolean> {
    const token = tokenOverride || this.token;
    if (!token) {
      this.logger.warn('WHAPI_TOKEN not set — no se puede borrar el mensaje');
      return false;
    }

    try {
      const res = await fetch(`${this.apiUrl}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`No se pudo borrar el mensaje ${messageId}: ${res.status} ${body}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.warn(`Fallo borrando el mensaje ${messageId}`, err);
      return false;
    }
  }
```

- [ ] **Step 3: Compilar**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/webhooks/whapi.service.ts
git commit -m "feat(webhooks): borrar el mensaje de comando del chat vía Whapi"
```

---

## Task 11: Reestructurar el webhook de WhatsApp

La tarea más grande. Cambia `extractMessages` para conservar los mensajes
salientes, parte `receive()` en dos ramas y arregla el `enrichLeadAsync` roto.

**Files:**
- Modify: `backend/src/webhooks/whatsapp.controller.ts` (reemplaza `receive`,
  `enrichLeadAsync` y `extractMessages`)

- [ ] **Step 1: Conservar los mensajes salientes en `extractMessages`**

Reemplazar el método completo. El cambio de fondo es el campo `fromMe` y quitar
el `continue` que descartaba los salientes.

```typescript
  private extractMessages(body: any): Array<{
    from: string;
    messageId: string;
    text: string;
    profileName: string;
    fromMe: boolean;
  }> {
    const result: Array<{
      from: string;
      messageId: string;
      text: string;
      profileName: string;
      fromMe: boolean;
    }> = [];

    // Whapi format
    if (body?.messages) {
      const contacts: Record<string, string> = {};
      for (const c of body?.contacts || []) {
        contacts[c.id] = c.name || c.id;
      }
      for (const msg of body.messages) {
        if (msg.type !== 'text') continue;

        // En los salientes, `from` es el número del negocio: el interlocutor
        // está en `chat_id`. Es el teléfono con el que buscamos la conversación.
        const counterpart = msg.from_me
          ? String(msg.chat_id ?? '').replace(/@.*$/, '')
          : msg.from;
        if (!counterpart) continue;

        result.push({
          from: counterpart,
          messageId: msg.id,
          text: msg.text?.body || '',
          profileName: contacts[counterpart] || counterpart,
          fromMe: Boolean(msg.from_me),
        });
      }
      return result;
    }

    // Meta Cloud API format — no entrega los salientes del agente.
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.length) return result;

    for (const message of value.messages) {
      if (message.type !== 'text') continue;
      result.push({
        from: message.from,
        messageId: message.id,
        text: message.text?.body || '',
        profileName: value.contacts?.[0]?.profile?.name || message.from,
        fromMe: false,
      });
    }

    return result;
  }
```

- [ ] **Step 2: Reescribir `receive()`**

```typescript
  /** POST — Receive incoming WhatsApp messages (?tenant=slug for multi-tenant routing) */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any, @Query('tenant') tenantSlug?: string) {
    try {
      // ── 1. Resolver tenant ────────────────────────────────────────────────
      let tenantId: string | undefined;
      let whapiToken: string | undefined;
      let projectId: string | undefined;
      let buildingSlug = tenantSlug ?? '';

      if (tenantSlug) {
        const tenant = await this.tenantsService.findBySlug(tenantSlug);
        if (tenant) {
          tenantId = tenant.id;
          whapiToken = tenant.whapi_token;
          projectId = tenant.default_project_id;
          buildingSlug = tenant.slug;
        } else {
          this.logger.warn(`Webhook received for unknown tenant slug: ${tenantSlug}`);
        }
      }

      if (!whapiToken) whapiToken = this.configService.get<string>('WHAPI_TOKEN');
      if (!projectId) projectId = this.configService.get<string>('DEFAULT_PROJECT_ID');
      if (!buildingSlug) {
        buildingSlug = this.configService.get<string>('DEFAULT_BUILDING_SLUG') ?? 'oasis-park';
      }

      const resumeHours = Number(
        this.configService.get<string>('NOVA_RESUME_HOURS') ?? DEFAULT_RESUME_HOURS,
      );

      // ── 2. Extraer mensajes (salientes incluidos) ─────────────────────────
      const messages = this.extractMessages(body);

      for (const { from, messageId, text, profileName, fromMe } of messages) {
        // ── 3. Mensaje del asesor: comando o toma de control ────────────────
        if (fromMe) {
          await this.handleAgentMessage({
            phone: from,
            messageId,
            text,
            tenantId,
            whapiToken,
            buildingSlug,
          });
          continue;
        }

        this.logger.log(
          `Incoming WhatsApp from ${from} [tenant:${tenantSlug ?? 'default'}]: "${text}"`,
        );

        // ── 4. Conversación, lead y mensaje entrante ────────────────────────
        const conv = await this.conversationsService.findOrCreateByPhone(
          from, 'whatsapp', profileName, tenantId,
        );
        const isNewConversation = !conv.lead_id;

        if (isNewConversation && projectId) {
          const { lead, created } = await this.leadsService.findOrCreateByPhone(
            from,
            projectId,
            profileName !== from ? profileName : undefined,
          );
          if (created) {
            this.logger.log(`Lead creado automáticamente: ${lead.id} para ${from}`);
          }
          await this.conversationsService.updateConversation(conv.id, { lead_id: lead.id });
        }

        await this.conversationsService.ingestWhatsAppMessage({
          from,
          messageId,
          body: text,
          profileName,
          timestamp: String(Date.now()),
        });

        const allMessages = await this.conversationsService.getMessages(conv.id);
        const history: ChatMessage[] = allMessages
          .slice(-21, -1)
          .map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));

        // ── 5. Pausa y ventana de reactivación ──────────────────────────────
        const freshConv = await this.conversationsService.findConversationById(conv.id);
        if (freshConv.nova_paused) {
          if (shouldAutoResume(freshConv, new Date(), resumeHours)) {
            await this.conversationsService.resumeNova(conv.id);
            this.logger.log(
              `Nova retoma ${from} — ${resumeHours}h sin actividad del asesor`,
            );
          } else {
            this.logger.log(`Nova pausada para ${from} — asesor tiene el control`);
            continue;
          }
        }

        // ── 6. Responder ────────────────────────────────────────────────────
        const novaReply = await this.novaService.generateResponse(text, history, {
          buildingSlug,
          projectId,
        });

        if (!novaReply) {
          this.logger.warn(
            `Nova no respondió a ${from}: sin perfil utilizable para "${buildingSlug}"`,
          );
          continue;
        }

        await this.conversationsService.addMessage(conv.id, {
          content: novaReply,
          sender_type: 'bot',
          sender_name: 'Nova',
        });

        await this.whapiService.sendText(from, novaReply, whapiToken);
        this.logger.log(`Nova replied to ${from}: "${novaReply.substring(0, 80)}..."`);

        // ── 7. Avance del lead ──────────────────────────────────────────────
        const freshConv2 = await this.conversationsService.findConversationById(conv.id);
        if (freshConv2.lead_id && allMessages.length <= 2) {
          await this.leadsService.updateFromNova(freshConv2.lead_id, { status: 'contacted' });
          this.logger.log(`Lead ${freshConv2.lead_id} → contacted`);
        }

        if (allMessages.length >= 4 && allMessages.length % 4 === 0) {
          this.enrichLeadAsync(conv.id, [...history, { role: 'user', content: text }]);
        }
      }
    } catch (err) {
      this.logger.error('Error processing WhatsApp webhook', err);
    }

    return { status: 'ok' };
  }
```

- [ ] **Step 3: Escribir `handleAgentMessage()`**

Método nuevo, justo después de `receive()`:

```typescript
  /**
   * Mensaje escrito desde el WhatsApp del negocio. O es un comando de control, o
   * es el asesor atendiendo — y en ese caso Nova se calla en ese chat.
   */
  private async handleAgentMessage(params: {
    phone: string;
    messageId: string;
    text: string;
    tenantId?: string;
    whapiToken?: string;
    buildingSlug: string;
  }): Promise<void> {
    const { phone, messageId, text, tenantId, whapiToken, buildingSlug } = params;

    const conv = await this.conversationsService.findOrCreateByPhone(
      phone, 'whatsapp', undefined, tenantId,
    );

    const command = parseNovaCommand(text);

    if (command === 'pause') {
      await this.conversationsService.pauseNova(conv.id, 'whatsapp');
      this.logger.log(`#pausa — Nova silenciada en ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    if (command === 'resume') {
      await this.conversationsService.resumeNova(conv.id);
      this.logger.log(`#nova — Nova retoma ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    if (command === 'status') {
      const fresh = await this.conversationsService.findConversationById(conv.id);
      const estado = fresh.nova_paused
        ? `Nova está PAUSADA (por ${fresh.nova_paused_by ?? 'origen desconocido'}${
            fresh.nova_paused_at
              ? ` desde ${new Date(fresh.nova_paused_at).toLocaleString('es-CO')}`
              : ''
          })`
        : 'Nova está ACTIVA';
      await this.whapiService.deleteMessage(messageId, whapiToken);
      await this.whapiService.sendText(
        phone,
        `${estado}. Edificio: ${buildingSlug}.`,
        whapiToken,
      );
      return;
    }

    // No es comando: el asesor está atendiendo. Se guarda y Nova se calla.
    await this.conversationsService.addMessage(conv.id, {
      content: text,
      sender_type: 'agent',
      sender_name: 'Asesor',
      whatsapp_message_id: messageId,
    });
    await this.conversationsService.pauseNova(conv.id, 'whatsapp');
    this.logger.log(`Asesor escribió a ${phone} — Nova pausada`);
  }
```

- [ ] **Step 4: Arreglar `enrichLeadAsync()`**

El método actual recibe `convId` y no lo usa: vuelve a resolver la conversación
con `findOrCreateByPhone(phone, 'whatsapp')` **sin `tenantId`**, y si esa búsqueda
falla crea una conversación duplicada sin tenant. `whapiToken` tampoco se usa.
Reemplazar el método completo:

```typescript
  /** Fire-and-forget: extract lead info and auto-advance pipeline status */
  private async enrichLeadAsync(convId: string, history: ChatMessage[]) {
    try {
      const extraction = await this.novaService.extractLeadInfo(history);
      if (Object.keys(extraction).length === 0) return;

      const conv = await this.conversationsService.findConversationById(convId);
      if (!conv.lead_id) return;

      // Nova pidió escalar: se calla y queda marcada para el asesor.
      if (extraction.needs_human) {
        await this.conversationsService.pauseNova(convId, 'nova');
        this.logger.log(`Conversación ${convId} escalada a asesor humano`);
      }

      // ── Determine next status based on extraction ──────────────────────────
      let nextStatus: string | undefined;

      // Check if a visit was mentioned in the last messages
      const recentText = history
        .slice(-6)
        .map((m) => m.content.toLowerCase())
        .join(' ');

      const visitKeywords = ['visita', 'sala de ventas', 'agendar', 'lunes', 'martes',
        'miércoles', 'jueves', 'viernes', 'sábado', 'mañana', 'pasado mañana',
        'esta semana', 'próxima semana', 'te confirmo', 'voy a ir', 'puedo ir'];

      const visitMentioned = visitKeywords.some((kw) => recentText.includes(kw));

      if (visitMentioned) {
        nextStatus = 'pending'; // Visit scheduled
      } else if (
        (extraction.ai_score !== undefined && extraction.ai_score >= 60) ||
        extraction.priority === 'high'
      ) {
        nextStatus = 'qualified';
      }

      await this.leadsService.updateFromNova(conv.lead_id, {
        name: extraction.name,
        interested_in: extraction.financing
          ? `${extraction.interested_in || ''} | ${extraction.financing}`.replace(/^\s*\|\s*/, '').trim()
          : extraction.interested_in,
        ai_score: extraction.ai_score,
        priority: extraction.priority,
        status: nextStatus,
      });

      this.logger.log(
        `Lead ${conv.lead_id} enriquecido — score: ${extraction.ai_score ?? '?'}, status: ${nextStatus ?? 'sin cambio'}`,
      );
    } catch (err) {
      this.logger.warn('Error enriqueciendo lead:', err?.message);
    }
  }
```

> La detección de visita por palabras clave se conserva tal cual: es preexistente
> y arreglarla no es parte de este trabajo. Está anotada en el spec como el
> ejemplo de por qué el escalamiento **no** se hace con listas de palabras.

- [ ] **Step 5: Agregar los imports**

Al inicio de `whatsapp.controller.ts`, junto a los imports de Nova:

```typescript
import { NovaService, ChatMessage } from '../nova/nova.service';
import { parseNovaCommand } from '../nova/nova-commands';
import { shouldAutoResume, DEFAULT_RESUME_HOURS } from '../nova/nova-pause';
```

- [ ] **Step 6: Compilar y correr todas las pruebas**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json && npx jest`
Expected: compilación limpia, todas las pruebas en verde.

- [ ] **Step 7: Verificar que no quedaron parámetros muertos**

**`npm run lint` no funciona en este repo:** no hay ningún `.eslintrc*` ni
`eslint.config*` en `backend/`, así que ESLint aborta con un error de
configuración. No inventar una configuración — eso es un trabajo aparte, y no
este. La comprobación equivalente la hace TypeScript:

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`

Y a mano, confirmar que `enrichLeadAsync` ya no recibe `whapiToken` ni en la
firma ni en la llamada:

Run: `cd backend && grep -n "enrichLeadAsync" src/webhooks/whatsapp.controller.ts`
Expected: dos líneas, ambas con exactamente dos argumentos (`convId` e
`history`).

- [ ] **Step 8: Commit**

```bash
git add backend/src/webhooks/whatsapp.controller.ts
git commit -m "feat(webhooks): control de Nova desde WhatsApp y ruteo por edificio"
```

---

## Task 12: Mostrar el estado en el CRM

**Files:**
- Modify: `frontend/src/components/ConversationsPage.tsx:26` (la interfaz) y
  `:275-287` (la insignia de la lista)

- [ ] **Step 1: Agregar los campos a la interfaz `Conversation`**

Junto a `nova_paused: boolean;` en la línea 26:

```typescript
  nova_paused: boolean;
  nova_paused_at?: string | null;
  nova_paused_by?: 'whatsapp' | 'crm' | 'nova' | null;
  needs_human?: boolean;
```

- [ ] **Step 2: Reemplazar la insignia de la lista**

El bloque actual muestra "Agente activo" para cualquier pausa. Distinguir el
origen —y sobre todo destacar las escaladas, que son las que necesitan a alguien:

```tsx
                      {conv.needs_human && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <span className="material-symbols-outlined text-[11px]">
                            priority_high
                          </span>
                          Necesita asesor
                        </span>
                      )}
                      {conv.nova_paused && !conv.needs_human && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          <span className="material-symbols-outlined text-[11px]">person</span>
                          {conv.nova_paused_by === 'whatsapp'
                            ? 'Agente activo (WhatsApp)'
                            : 'Agente activo'}
                        </span>
                      )}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build exitoso, sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ConversationsPage.tsx
git commit -m "feat(crm): distinguir el origen de la pausa y las conversaciones escaladas"
```

---

## Task 13: Verificación en el flujo real

Las pruebas unitarias cubren el prompt, los comandos y la ventana. Esto verifica
el cableado, que es donde no hay pruebas.

**Files:** ninguno — es verificación manual.

- [ ] **Step 1: Levantar el backend**

Run: `cd backend && npm run start:dev`
Expected: arranca sin errores. En el log no debe aparecer ninguna advertencia de
perfil de edificio.

- [ ] **Step 2: Suite completa**

Run: `cd backend && npx jest`
Expected: todas en verde. Anotar el número de pruebas y suites que pasan.

- [ ] **Step 3: Probar el flujo del cliente**

Desde un WhatsApp cualquiera, escribirle al número del negocio. Verificar:
- Nova responde.
- La respuesta son dos párrafos cortos, no un bloque largo.
- Si hay unidades en `units` con estado `Disponible` para el proyecto, la
  respuesta refleja la disponibilidad real y no la lista vieja de 33 unidades.

- [ ] **Step 4: Probar la toma de control**

Desde WhatsApp Web con el número del negocio, escribirle a ese mismo chat.
Verificar:
- El mensaje aparece en el CRM como del asesor.
- La conversación muestra "Agente activo (WhatsApp)".
- Si el cliente vuelve a escribir, Nova **no** responde.

- [ ] **Step 5: Probar los comandos**

Escribir `#nova` en el chat desde el número del negocio. Verificar:
- El comando desaparece del chat (o queda visible, si el plan de Whapi no permite
  borrar — comportamiento aceptado en la Tarea 10).
- El comando **no** aparece como mensaje en el CRM.
- La conversación vuelve a "Nova activa" en el CRM.
- Si el cliente escribe, Nova responde otra vez.

Repetir con `#pausa` y con `#estado`.

- [ ] **Step 6: Commit de cierre**

Si algo se ajustó durante la verificación:

```bash
git add -A backend/src frontend/src
git commit -m "fix(nova): ajustes de la verificación en el flujo real"
```

---

## Pendiente después del plan

**Los datos de Alpes Vista.** Llenar
`backend/src/nova/buildings/alpes-vista.building.ts` con la ficha del negocio, e
invertir la última prueba de `building-registry.spec.ts`. Del lado del sistema:
crear el tenant con `slug: 'alpes-vista'`, su `whapi_token` y su
`default_project_id`, apuntar el webhook de Whapi a
`/api/webhooks/whatsapp?tenant=alpes-vista`, y cargar las unidades en `units`.
