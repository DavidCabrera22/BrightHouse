# Mi día

La ruta `/crm/my-day` reúne los pendientes del usuario autenticado. La API está
en `/api/my-day`. Todas las consultas aplican aislamiento por empresa y por
asesor, también para Admin y SuperAdmin. No es una vista de toda la empresa.

## Activación

Antes de iniciar la nueva versión del backend, aplicar las migraciones con la
configuración del entorno de destino, desde `backend`:

```sh
npm run migration:show
npm run migration:run
```

La migración `1788820000000-AddMyDay` crea `day_tasks` y un índice para consultar
la actividad de las conversaciones. No requiere cambiar las claves de IA.
No se ha aplicado esta migración a producción como parte de la implementación.

## Criterios

- Por responder: conversaciones abiertas cuyo último mensaje real es del cliente,
  o que requieren atención humana. Las notas no cuentan como respuestas. El
  contador de mensajes no leídos no decide si falta responder.
- Por contactar: leads nuevos sin contacto registrado; el resto reaparece tras
  tres días sin mensajes ni un contacto marcado como realizado en Mi día.
  Los leads ganados y perdidos quedan excluidos.
- Seguimientos: tareas guardadas con fecha, cliente y propietario. Una tarea
  pendiente sustituye la sugerencia genérica de contacto para ese lead.
- Visitas: notas existentes con `metadata.type = visit` y `scheduled_at`.
  Completar una visita guarda su resultado en Mi día. Esto no introduce una
  agenda con cancelaciones o reprogramaciones de visitas.
- Cotizaciones: enviadas y sin decisión, cuando vencen hoy, ya vencieron o llevan
  al menos tres días sin actualizar. Una revisión las oculta durante ese día;
  reaparecen al siguiente si siguen necesitando atención.

Se utiliza la fecha de Colombia (`America/Bogota`). Las tareas nuevas requieren
fecha ISO con zona; las visitas históricas sin zona se interpretan como hora de
Colombia. Abrir WhatsApp o llamar no registra automáticamente un contacto ni
envía mensajes: el asesor debe pulsar «Registrar contacto realizado» después de
atender al cliente. Las respuestas pendientes se resuelven en la conversación.

La lista se actualiza al abrirla, al regresar a la ventana, tras una acción y
cada minuto mientras la pestaña está visible. Los errores conservan la lista
anterior y permiten reintentar. Los botones de completar son idempotentes.

## Validación

```sh
npm run build
npm test -- --runInBand
```

Las pruebas cubren asignación y aislamiento, SQL de consultas, contactos
recientes, duplicados, tareas completadas, visitas históricas y vencimientos en
Colombia. La pantalla se comprobó con datos ficticios en Chrome, en escritorio
y móvil, incluyendo creación, finalización y recuperación de errores de API.
