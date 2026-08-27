# Nova multi-edificio y control desde WhatsApp — diseño

Fecha: 2026-08-27
Estado: aprobado, pendiente de plan de implementación

## Problema

Nova, la asistente de WhatsApp, tiene tres límites que hoy bloquean la entrada de
un segundo edificio:

1. **El conocimiento del edificio está hardcodeado.** `SYSTEM_PROMPT` en
   `backend/src/nova/nova.service.ts` es una constante de TypeScript con los
   precios, tipologías, inventario piso por piso y datos de sala de ventas de
   Oasis Park. `generateResponse()` ni siquiera recibe el tenant, así que no hay
   por dónde variar la respuesta según el edificio. Agregar Alpes Vista con este
   diseño significaría duplicar el servicio.
2. **El inventario del prompt está congelado.** La lista de 33 unidades vive en
   el texto del prompt, mientras la tabla `units` tiene el estado real. Cada
   venta desincroniza a Nova y nadie se entera.
3. **Tomar el control solo se puede desde el CRM.** `nova_paused` existe en
   `conversations` y el botón "Tomar control" funciona, pero el asesor que está
   en su celular contestando por WhatsApp no tiene forma de silenciar a Nova sin
   entrar al CRM. En la práctica el asesor y Nova le escriben al cliente encima
   uno del otro.

Sobre el comportamiento, dos quejas concretas del uso real: Nova manda mensajes
largos y repetitivos para el medio, y no reconoce cuándo dejar de insistir y
pasarle la conversación a una persona.

## Alcance

**Dentro del alcance:**

- Perfil de edificio por tenant, con Oasis Park migrado y Alpes Vista nuevo.
- Bloque de inventario generado en tiempo real desde `units`.
- Pausa automática de Nova cuando el asesor escribe desde el WhatsApp del negocio.
- Comandos `#pausa` y `#nova` dentro del chat.
- Reactivación automática de Nova a las 12 horas sin actividad del asesor.
- Respuestas más cortas y sin repetición.
- Escalamiento explícito a humano con marca visible en el CRM.

**Fuera del alcance, por decisión explícita:**

- Editar el perfil del edificio desde la interfaz del CRM. La decisión fue
  híbrida: inventario desde la base de datos, copy en archivo. Mover el copy a la
  base de datos es un paso posterior y el tipo `BuildingProfile` queda listo para
  serializarse cuando llegue.
- Un solo número atendiendo dos edificios. Alpes Vista es un tenant aparte con su
  propio `whapi_token`, que es lo que el enrutamiento `?tenant=slug` ya soporta.
- Notificación push al asesor cuando una conversación necesita humano. Por ahora
  la señal es el indicador en el CRM.
- Aplicar lo mismo al webhook de Instagram. `instagram.controller.ts` comparte la
  lógica de pausa y se beneficia del perfil de edificio, pero el control por
  mensaje saliente es específico de WhatsApp. Se deja para después.

## Decisiones y sus razones

**Un archivo por edificio, inventario desde la base de datos.** El copy de marca
—tono, identidad, esquema de pago, guion de cierre— cambia poco y se revisa mejor
en un diff; el inventario cambia todos los días y ya tiene dueño en la tabla
`units`. Mezclarlos en el prompt es lo que produjo el problema 2. Separarlos deja
cada dato en la fuente que ya lo mantiene.

**El perfil se resuelve por `tenant.slug`, y su ausencia es un error, no un
fallback.** Si un tenant no tiene perfil registrado, Nova no responde y se
registra el fallo. La alternativa —caer al perfil por defecto— haría que un
prospecto de Alpes Vista reciba precios de Oasis Park, que es peor que no recibir
respuesta.

**Escribir desde el WhatsApp del negocio pausa a Nova.** Whapi entrega los
mensajes salientes en el mismo webhook con `from_me: true`; hoy
`extractMessages()` los descarta con un `continue`. Usar esa señal significa que
el asesor no tiene que aprender nada: abre WhatsApp, escribe, y Nova se calla. Un
comando obligatorio antes de hablar se olvida justo en el momento de apuro en que
más importa.

**`from_me` no basta: hay que mirar `source`.** Whapi reenvía por ese mismo
webhook los mensajes que nosotros enviamos **por su API**, también con
`from_me: true`. Tratar todo `from_me` como "el asesor tomó el control" hace que
la respuesta de Nova vuelva como si fuera del asesor y **Nova se pause a sí
misma después de cada respuesta**: toda conversación quedaría muda desde el
primer turno. El campo `source` es el discriminador —`api` somos nosotros,
`system` son eventos de la propia WhatsApp, y `mobile`/`web`/`desktop` son una
persona escribiendo—. La documentación de Whapi lo dice explícitamente: filtrando
así, "tu bot no reaccionará a sus propias respuestas".

Un saliente sin `source` se descarta y se cuenta en el log. Perder la toma de
control es molesto; confundir un eco de Nova con el asesor rompe el producto.

**El filtro de tipo va después del `from_me`, no antes.** Un mensaje entrante que
no es texto no le sirve a Nova y se descarta. Uno saliente sí importa aunque no
sea texto: en este mercado la primera respuesta del asesor suele ser una nota de
voz, y Nova no puede seguir escribiendo encima.

**Solo chats 1:1.** El `chat_id` de un grupo termina en `@g.us` y el de un estado
es `status@broadcast`. Recortar el sufijo a ciegas convierte esos identificadores
en teléfonos falsos y crea conversaciones basura en el CRM. Se exige
`@s.whatsapp.net`.

**Los comandos existen igual, para el caso preventivo.** `#pausa` sirve para
silenciar a Nova sin escribirle todavía al cliente —por ejemplo, mientras el
asesor busca un dato— y `#nova` es la forma de devolver el control sin entrar al
CRM.

**Reactivación a las 12 horas.** Una conversación pausada y olvidada es un lead
muerto en silencio, que es la falla más cara y la más difícil de notar. La
ventana se mide desde el último mensaje del asesor, no desde la pausa: mientras
el asesor esté activo en el chat, Nova no se mete. El plazo es configurable por
variable de entorno.

**El tope de respuesta se baja a nivel de API, no solo de prompt.** `max_tokens`
está en 1024, que en WhatsApp son varias pantallas. Una instrucción de "sé breve"
en el prompt es una sugerencia; `max_tokens: 400` es un techo. Van los dos: la
regla explica el formato deseado, el parámetro lo garantiza.

**El escalamiento auto-pausa.** Cuando Nova detecta que debe pasar a humano, no
basta con decirlo: si sigue respondiendo, sigue dando vueltas. Marca la
conversación, avisa al cliente y se calla, que es exactamente el mismo estado que
produce el botón "Tomar control".

## Arquitectura

### Módulo `nova` — archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `backend/src/nova/buildings/building-profile.ts` | El tipo `BuildingProfile`: identidad, ubicación, tipologías, esquema de pago, sala de ventas, horarios, contactos, reglas de tono. Sin NestJS. |
| `backend/src/nova/buildings/oasis-park.building.ts` | El contenido actual del `SYSTEM_PROMPT`, migrado a datos. Sin el bloque de inventario. |
| `backend/src/nova/buildings/alpes-vista.building.ts` | El perfil nuevo, con los datos de la sección "Datos de entrada". |
| `backend/src/nova/buildings/building-registry.ts` | Mapa `slug → BuildingProfile` y `getBuildingProfile(slug)`, que lanza si no existe. |
| `backend/src/nova/prompt-builder.ts` | Función pura: `buildSystemPrompt(profile, inventorySummary)`. Sin base de datos. |
| `backend/src/nova/prompt-builder.spec.ts` | Pruebas del ensamblado. |
| `backend/src/nova/inventory-summary.service.ts` | Consulta `units` por `project_id`, arma el resumen y lo cachea 5 minutos. |
| `backend/src/nova/nova-commands.ts` | Parser puro de comandos del asesor. |
| `backend/src/nova/nova-commands.spec.ts` | Pruebas del parser. |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/nova/nova.service.ts` | `generateResponse(userMessage, history, ctx)` recibe `{ buildingSlug, projectId }`, arma el prompt con el builder, `max_tokens: 400`. Se elimina `SYSTEM_PROMPT`. |
| `backend/src/nova/nova.module.ts` | Registrar `InventorySummaryService` y el repositorio de `Unit`. |
| `backend/src/webhooks/whatsapp.controller.ts` | Dejar de descartar `from_me`, rama de mensaje del asesor, comandos, ventana de reactivación, pasar el contexto de edificio a Nova. |
| `backend/src/conversations/entities/conversation.entity.ts` | Campos `nova_paused_at`, `nova_paused_by`, `needs_human`. |
| `backend/src/conversations/conversations.service.ts` | Sellar `nova_paused_at` y `nova_paused_by` al pausar y despausar, también desde el CRM. |
| `frontend/src/components/ConversationsPage.tsx` | Mostrar el origen de la pausa y el indicador de "necesita asesor". |

### Flujo del webhook

El orden importa y cambia respecto del actual, donde la comprobación de pausa
ocurre en el paso 5, después de crear el lead y guardar el mensaje.

1. Resolver tenant por `?tenant=slug`, con los valores de entorno como respaldo.
2. Extraer mensajes, **conservando los que traen `from_me: true`**.
3. **Si el mensaje es del asesor (`from_me`):**
   - Si es un comando reconocido: ejecutarlo, no guardarlo como mensaje de la
     conversación, intentar borrarlo del chat, y terminar.
   - Si no: guardarlo como `sender_type: 'agent'`, marcar `nova_paused = true`,
     `nova_paused_at = ahora`, `nova_paused_by = 'whatsapp'`, `needs_human = false`,
     y terminar. Nova no responde. El sello de tiempo se reescribe con **cada**
     mensaje del asesor, que es lo que hace que la ventana se mida desde su
     última actividad y no desde la pausa original.
4. **Si el mensaje es del cliente:** buscar o crear la conversación y el lead,
   guardar el mensaje entrante.
5. **Ventana de reactivación:** si la conversación está pausada y
   `nova_paused_at` tiene más de `NOVA_RESUME_HOURS` (por defecto 12), despausar
   y seguir. Si está pausada y dentro de la ventana, terminar sin responder.
   **La ventana no aplica cuando `nova_paused_by = 'nova'`:** una conversación
   escalada solo la reactiva una persona, con `#nova` o con el botón del CRM.
   Reactivarla sola devolvería a Nova exactamente a la situación que la hizo
   escalar.
6. Resolver el perfil del edificio por el slug del tenant y el resumen de
   inventario por `project_id`.
7. Generar la respuesta, guardarla, enviarla por Whapi.
8. Enriquecimiento del lead y avance de estado, como hoy.

### Consulta de inventario y aislamiento

`InventorySummaryService` consulta `units` filtrando explícitamente por
`project_id` y por los estados que cuentan como disponibles. Es una ruta de
sistema: el webhook ya resolvió el tenant desde el payload, igual que los métodos
sin sufijo `ForTenant` que documenta el CLAUDE.md. El `project_id` viene del
`default_project_id` del tenant, nunca de un dato enviado por el cliente, así que
no hay referencia externa que validar.

El resumen que se inyecta al prompt es agregado, no un listado crudo: total de
disponibles, desglose por tipología con área y rango de precios, y pisos con
disponibilidad. Un listado de 127 unidades en cada mensaje gastaría el contexto
sin mejorar la respuesta.

Cache en memoria de 5 minutos por `project_id`. Un mensaje de WhatsApp no
justifica una consulta a Supabase por turno, y 5 minutos de desfase en el conteo
de disponibles no cambia ninguna respuesta.

## Modelo de datos

Tres columnas nuevas en `conversations`, con migración TypeORM
(`synchronize` está apagado):

| Columna | Tipo | Propósito |
|---|---|---|
| `nova_paused_at` | `timestamp null` | Cuándo se pausó. Base de la ventana de 12h. |
| `nova_paused_by` | `varchar null` | `whatsapp`, `crm` o `nova`. Para mostrar el origen y para depurar. |
| `needs_human` | `boolean default false` | Nova pidió escalar. Se apaga cuando un asesor responde. |

`nova_paused` se queda como está: es el campo que ya lee el webhook y que ya
escribe el CRM, y ambos caminos siguen funcionando sin cambios.

## Comandos del asesor

Se reconocen solo en mensajes con `from_me: true`, comparando el texto completo
sin distinguir mayúsculas ni espacios sobrantes. Un mensaje que solo *contiene*
la palabra no es un comando: el asesor tiene que poder escribirle "hago una pausa
y te confirmo" al cliente sin silenciar el bot.

| Comando | Efecto |
|---|---|
| `#pausa` | `nova_paused = true`, sella `nova_paused_at` y `nova_paused_by = 'whatsapp'`. |
| `#nova` | `nova_paused = false`, limpia `nova_paused_at` y `needs_human`. |
**No hay comando de estado.** Se diseñó un `#estado` y se descartó al
implementarlo: el comando se puede borrar del chat, pero su respuesta no —
`sendText` la manda a la conversación del prospecto, que vería un texto interno
("Nova está PAUSADA desde…"). El estado de la conversación se consulta en el CRM,
que ya lo muestra. `#pausa` y `#nova` no tienen el problema porque solo borran.

**Borrado del comando.** El comando no debería quedar visible para el cliente. Al
implementar hay que verificar contra la API de Whapi que el borrado de mensajes
propios está disponible en el plan contratado. Si lo está, se borra y el asesor
ve desaparecer el mensaje como confirmación. Si no lo está, la decisión ya está
tomada: los comandos se dejan visibles y se documenta el comportamiento, en vez
de inventar un canal de control aparte. El comando nunca se guarda como mensaje
de la conversación en el CRM, se pueda borrar del chat o no.

## Cambios de comportamiento en el prompt

**Formato.** Máximo dos párrafos cortos, con un tope duro de `max_tokens: 400`.
Prohibido resaludar cuando el historial ya tiene mensajes. Prohibido repreguntar
un dato que el cliente ya dio en la conversación. Una sola pregunta por mensaje,
que es una regla que el prompt actual ya tiene y conviene conservar.

**Escalamiento.** Nova pasa a humano ante: una pregunta concreta sobre el caso de
crédito del cliente, un intento de negociar el precio, una queja o reclamo, una
petición explícita de hablar con un asesor, o dos turnos seguidos sin que la
conversación avance. Al dispararse: cierra con una frase de traspaso, el
controlador marca `needs_human = true` y `nova_paused = true` con
`nova_paused_by = 'nova'`, y deja de responder.

La detección la hace el modelo, no una lista de palabras clave. El
`enrichLeadAsync` actual ya muestra el problema de las listas: busca "sábado" o
"mañana" en el texto para deducir que se agendó una visita, y marca la visita
como agendada cuando el cliente dice "mañana te cuento". La señal de escalamiento
viaja en la extracción estructurada que ya corre cada 4 mensajes, ampliada con un
campo `needs_human`.

## El disparo del enriquecimiento estaba muerto

`enrichLeadAsync` se lanzaba con `allMessages.length >= 4 && allMessages.length % 4 === 0`.
`allMessages` se lee después de guardar el mensaje del cliente y antes de la
respuesta de Nova, así que en una conversación alternada el conteo es siempre
impar —1, 3, 5, 7…— y el módulo 4 nunca se cumple. El enriquecimiento del lead
no corría nunca, y con él tampoco el `needs_human` sobre el que se apoya todo el
escalamiento de este diseño. Ahora se cuentan los turnos del cliente, cada dos.

## Arreglo puntual incluido

`enrichLeadAsync()` en `whatsapp.controller.ts` recibe `convId` y no lo usa:
vuelve a resolver la conversación con `findOrCreateByPhone(phone, 'whatsapp')`,
**sin `tenantId`**. Si esa búsqueda no da con la conversación existente, crea una
duplicada sin tenant, que queda invisible para el CRM y fuera de todo aislamiento.
El parámetro `whapiToken` tampoco se usa. Como el flujo del controlador se
reestructura en este trabajo, se corrige de paso: usar `convId` y eliminar el
parámetro muerto.

## Manejo de errores

- **Tenant sin perfil de edificio:** no se responde, se registra en el log con el
  slug. No se cae al perfil por defecto.
- **Fallo de la consulta de inventario:** Nova responde con el perfil sin bloque
  de inventario, y el prompt le indica remitir la disponibilidad al asesor. Es
  preferible a no responder.
- **Fallo del borrado del comando:** se registra y se sigue. El comando ya surtió
  efecto; lo único perdido es que el cliente lo vea.
- **Fallo de la API de Anthropic:** sin cambio, se conserva `ERROR_MESSAGE`.
- **Mensaje saliente de una conversación que no existe:** el asesor escribió
  primero, antes de cualquier mensaje del cliente. Se crea la conversación con el
  tenant resuelto y se marca pausada.

## Pruebas

Las tres piezas con lógica propia se prueban unitariamente; el resto es cableado
que se verifica con el flujo completo.

- `prompt-builder.spec.ts` — el prompt incluye los datos del perfil, incluye el
  bloque de inventario cuando lo hay, y produce un prompt válido cuando no lo hay.
- `nova-commands.spec.ts` — reconoce cada comando; no reconoce la palabra dentro
  de una frase; ignora mayúsculas y espacios; un mensaje del cliente con el mismo
  texto no es un comando.
- Ventana de reactivación — pausada dentro de la ventana no responde; pausada
  fuera de la ventana responde y despausa; sin pausar responde.
- Verificación manual en el flujo real: escribir desde el WhatsApp del negocio y
  confirmar que Nova se calla y que el mensaje aparece en el CRM.

## Datos de entrada requeridos — Alpes Vista

El perfil no se puede escribir sin esto. Es entrada del negocio, no una decisión
de diseño pendiente:

- Nombre comercial y ubicación exacta (barrio, ciudad, referencia cercana).
- Número de pisos, de apartamentos y de apartamentos por piso.
- Tipologías: área, distribución y qué las diferencia entre sí.
- Precio y si aplica subsidio VIS.
- Esquema de pago: porcentaje y monto de cuota inicial, saldo, cuota mensual
  aproximada.
- Constructora y fiducia.
- Zonas comunes.
- Dirección de la sala de ventas y horarios de asesores.
- Teléfono de WhatsApp y correo de contacto.
- Fecha de entrega.

Además, del lado del sistema: el tenant de Alpes Vista creado con su `slug`, su
`whapi_token` y su `default_project_id`, y las unidades cargadas en `units` para
que el bloque de inventario tenga de dónde salir.
