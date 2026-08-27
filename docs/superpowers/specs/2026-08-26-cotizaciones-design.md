# Cotizaciones (quotes) — diseño

Fecha: 2026-08-26
Estado: aprobado, pendiente de plan de implementación

## Problema

El CRM registra ventas (`sales`: unidad, cliente, agente, valor, estado) pero no
tiene forma de cotizar antes de vender. Hoy el agente arma el plan de pagos por
fuera del sistema y no queda rastro de qué se le ofreció a cada cliente.

## Alcance

Un agente, dentro de un proyecto, arma una cotización para un cliente sobre una
unidad concreta: separación, cuota inicial en N cuotas mensuales y saldo con
crédito hipotecario. La cotización se guarda con su cronograma, tiene estado y
vigencia, y se puede descargar en PDF.

**Dentro del alcance (v1):** creación por el agente en el CRM, cronograma
guardado, estados con vigencia, PDF descargable.

**Fuera del alcance (v1), por decisión explícita:**

- Simulador público en la web para que el visitante cotice solo.
- Convertir la cotización en venta (`sales`) y mover el estado de la unidad.
- Registrar pagos reales por cuota (cartera).
- Plantillas de plan de pagos por proyecto: los parámetros se digitan en cada
  cotización, con valores por defecto en el formulario.
- Duplicar una cotización.

El modelo de datos está pensado para que "registrar pagos" después sea agregar
columnas a `quote_installments`, no rehacer el esquema.

## Decisiones y sus razones

**El cronograma se guarda fila por fila, no se recalcula.** La cotización es un
documento con fecha. Si mañana sube el precio de la unidad, la cotización de hoy
tiene que seguir diciendo lo mismo. Por eso `quotes` congela `unit_price` y los
totales, y cada cuota es una fila de `quote_installments`. Un JSONB daría el
mismo snapshot pero no se puede consultar por SQL ("cuotas que vencen este mes").

**`expired` se calcula, no se almacena.** Una fecha pasada ya es toda la
información necesaria; no hace falta un cron diario venciendo cotizaciones.

**Una cotización enviada no se edita.** El cliente ya tiene el documento en la
mano. Si cambian las condiciones, se hace otra.

**El motor de cálculo es una función pura**, sin base de datos, usada tanto por
la vista previa como por el guardado. Así la matemática se prueba sola y no se
duplica en el frontend.

**`agent_id` sale del token**, no del body: el que cotiza es el que está logueado.

## Modelo de datos

```
quotes
  id                     uuid pk
  project_id             uuid  → projects
  unit_id                uuid  → units
  client_id              uuid  → clients
  agent_id               uuid  → users
  code                   varchar               COT-2026-0007
  status                 varchar default 'draft'
  quote_date             date
  valid_until            date
  unit_price             numeric(15,2)         snapshot del precio del día
  discount               numeric(15,2) default 0
  total_value            numeric(15,2)
  reservation_amount     numeric(15,2) default 0   (separación)
  down_payment_percent   numeric(5,2)
  down_payment_value     numeric(15,2)
  installments_count     int
  installment_amount     numeric(15,2)
  first_installment_date date
  balance_value          numeric(15,2)         saldo a crédito
  notes                  text null
  created_at / updated_at
  índice único (project_id, code)

quote_installments
  id        uuid pk
  quote_id  uuid → quotes (ON DELETE CASCADE)
  number    int
  concept   varchar        'separacion' | 'cuota' | 'saldo'
  amount    numeric(15,2)
  due_date  date
  created_at
```

`quotes` lleva `project_id` propio (como `clients`, `leads` y `documents`) porque
toda la UI lista por proyecto y el consecutivo necesita un índice único estable.
Al escribir se valida que la unidad y el cliente pertenezcan a ese proyecto.

Esquema por migración: `npm run migration:generate -- src/migrations/AddQuotes`
y `migration:run`. Nunca `DB_SYNCHRONIZE`: el `.env` apunta a la base de
producción.

## Aislamiento por tenant

En `tenant-paths.ts`:

```
[Quote, ['project']]
[QuoteInstallment, ['quote', 'project']]
```

`tenant-scope.spec.ts` falla si falta el registro.

- Controller: `@CurrentTenant() tenant: TenantContext`, nunca `req.user.tenant_id`.
- Service: `scoped(Quote, 'quote', ctx)` en **todas** las lecturas, incluido
  `findOne` — un `findOne` sin scope es un IDOR.
- Escrituras: `assertProjectInTenant(project_id, ctx)`,
  `assertReference(Unit, unit_id, ctx)`, `assertReference(Client, client_id, ctx)`,
  y además `unit.project_id === client.project_id === project_id` (400 si no).

## Motor de cálculo

`quote-calculator.ts`, función pura:

```
total_value        = unit_price − discount
down_payment_value = redondeo(total_value × down_payment_percent / 100)
balance_value      = total_value − down_payment_value
a_financiar        = down_payment_value − reservation_amount
installment_amount = piso(a_financiar / installments_count)
```

Cronograma generado:

1. Una fila `separacion` con vencimiento en `quote_date` (se omite si
   `reservation_amount` es 0).
2. `installments_count` filas `cuota`, mensuales, desde `first_installment_date`.
3. Una fila `saldo` por `balance_value`, un mes después de la última cuota.

Reglas:

- **El redondeo se absorbe en la última fila `cuota`** (no en la de `saldo`, que
  vale exactamente `balance_value`) y no se reparte entre las demás. Todos los
  redondeos son al peso. Invariante probada: la suma de las filas es exactamente
  `total_value`.
- **Fin de mes**: si la primera cuota cae el 31, los meses de 30 días usan el
  último día del mes; no se desborda al 1º del siguiente.
- **Validaciones que devuelven 400**: `discount > unit_price`,
  `reservation_amount > down_payment_value`, `installments_count < 1`,
  `down_payment_percent` fuera de 0–100.

## API

Módulo `backend/src/quotes/`: controller, service, las dos entidades, DTOs,
`quote-calculator.ts` y `quote-pdf.service.ts`. Registrado en `app.module.ts`.
Todos los endpoints bajo `JwtAuthGuard + RolesGuard`.

| Método | Ruta | Roles | Qué hace |
|---|---|---|---|
| POST | `/api/quotes/preview` | Admin, Agent | Calcula el cronograma sin guardar (alimenta la tabla en vivo del formulario) |
| POST | `/api/quotes` | Admin, Agent | Crea en `draft` y genera las cuotas, en una transacción |
| GET | `/api/quotes?project_id=&status=` | Admin, Agent | Lista filtrada |
| GET | `/api/quotes/:id` | Admin, Agent | Detalle con sus cuotas ordenadas |
| PATCH | `/api/quotes/:id` | Admin, Agent | Solo en `draft`: borra las cuotas y las regenera |
| PATCH | `/api/quotes/:id/status` | Admin, Agent | Cambio de estado |
| GET | `/api/quotes/:id/pdf` | Admin, Agent | Devuelve el PDF en streaming |
| DELETE | `/api/quotes/:id` | Admin | Borra (las cuotas caen por cascade) |

### Estados

Almacenados: `draft | sent | accepted | rejected`.

Transiciones válidas: `draft → sent`, `sent → accepted`, `sent → rejected`.
Cualquier otra devuelve 400.

`is_expired` se calcula en la respuesta: `status === 'sent' && valid_until < hoy`.

PATCH de montos sobre una cotización que no está en `draft` devuelve 400.

### Consecutivo

`COT-{año}-{4 dígitos}`, contando las cotizaciones del proyecto en ese año. El
índice único `(project_id, code)` arbitra las escrituras simultáneas; ante
violación se reintenta (hasta 3 veces). No hay contador en memoria.

## Frontend

Ruta `/crm/projects/:projectId/quotes` en `App.tsx`, con pestaña "Cotizaciones"
en la barra del proyecto.

**Refactor incluido:** esa barra está duplicada en `ProjectDashboardPage.tsx` y
`ProjectAnalyticsPage.tsx`; se extrae a `ProjectTabs.tsx` y ambas la usan. Es el
único refactor del alcance.

Tres componentes, no uno — `ProjectUnitsPage.tsx` ya va en 1857 líneas:

- **`ProjectQuotesPage.tsx`** — tabla (código, cliente, unidad, valor total,
  cuota mensual, estado, vigencia, acciones), filtro por estado, botón "Nueva
  cotización".
- **`QuoteFormModal.tsx`** — campos a la izquierda: unidad (select del proyecto,
  precarga el precio), cliente (buscador entre los del proyecto, con "Nuevo
  cliente" que despliega los cuatro campos y lo crea con `POST /api/clients`
  antes de guardar), descuento, separación, % inicial (30), nº de cuotas (12),
  fecha de la primera cuota (1º del mes siguiente), vigencia en días (15), notas.
  A la derecha, resumen y cronograma en vivo contra `POST /api/quotes/preview`
  con debounce de ~400 ms.
- **`QuoteDetailModal.tsx`** — resumen, cronograma y acciones: Descargar PDF,
  Marcar enviada / Aceptada / Rechazada, Editar solo en borrador. Chip "Vencida"
  cuando `is_expired`.

Moneda: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP',
maximumFractionDigits: 0 })`.

## PDF

`quote-pdf.service.ts` con **pdfkit** (no hay librería de PDF en el backend hoy).
Contenido: encabezado con proyecto, ubicación, consecutivo y fecha; datos del
cliente (nombre, cédula, teléfono, correo) y de la unidad (código, torre, piso,
área, tipología); cuadro de valores (precio, descuento, total, separación,
inicial con su porcentaje, saldo a crédito); tabla de cuotas (nº, concepto,
fecha, valor); pie con la vigencia y la nota *"Esta cotización es informativa y
no constituye promesa de compraventa. Valores sujetos a cambio sin previo
aviso."*

Se genera al vuelo y se transmite: no se guarda en disco ni en Cloudinary, así
no hay archivo que se desincronice de los datos. Cabecera
`Content-Disposition: attachment; filename="Cotizacion-COT-2026-0007.pdf"`.

El frontend lo descarga con `fetch` + `Authorization` → `blob`, como
`ProjectDocumentsPage.tsx:60-69`. Un `<a href>` plano no lleva el token y daría
401.

Sin logo en v1: `project.image` vive en Cloudinary y traerlo obligaría a una
llamada remota en cada PDF.

## Pruebas

- **`quote-calculator.spec.ts`** — el grueso. La suma de las cuotas es
  exactamente el total (varios porcentajes, N y descuentos); el redondeo cae en
  la última cuota; el 31 de enero vence el 28/29 de febrero; cada validación
  devuelve su error.
- **`tenant-scope.spec.ts`** — registrar `Quote` y `QuoteInstallment`; la prueba
  existente falla si se olvida.
- **`quotes.service.spec.ts`** — `findOne` de otro tenant lanza NotFound; editar
  una `sent` da 400; una transición inválida da 400.

## Manejo de errores

- Referencias a otro tenant: NotFound (nunca Forbidden — no se confirma que el
  id exista).
- Unidad o cliente de otro proyecto: 400 con mensaje explícito.
- Parámetros inconsistentes: 400 desde el validador del motor de cálculo, antes
  de tocar la base.
- Colisión de consecutivo: se reintenta; si falla tres veces, 500.
