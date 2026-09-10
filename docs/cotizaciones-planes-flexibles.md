# Cotizaciones con planes de pago flexibles

## Uso

En **Cotizaciones → Nueva cotización**, el campo **Plan de pagos** ofrece:

- **Cuotas mensuales + abonos extra**: reparte la inicial pendiente entre las
  mensualidades después de descontar la separación y los extras pactados.
  Cada extra tiene valor y fecha propios. Por ejemplo, con una inicial de
  $96.000.000, separación de $5.000.000 y un extra de $19.000.000, quedan
  doce cuotas de $6.000.000.
- **Personalizado**: permite agregar, eliminar y modificar cuotas y extras con
  valores y fechas independientes. Al pasar desde un plan mensual válido se
  copian sus pagos como punto de partida. El indicador muestra cuánto falta
  distribuir o cuánto excede la inicial. **Ajustar última cuota** permite
  completar el valor pendiente mediante una acción explícita.

La separación se programa en la fecha de cotización. El saldo final puede tener
una fecha pactada; si se deja vacía se calcula al finalizar la inicial. Los pagos
aparecen en orden de vencimiento tanto en pantalla como en el PDF. Los extras
son parte de la inicial; no aumentan el precio de la unidad ni representan
registro de pagos recibidos.

En **Ver → Editar cotización** se pueden modificar los borradores. Si se mantiene
la misma unidad, se conserva el precio guardado aunque el precio de lista haya
cambiado. Las cotizaciones enviadas, aceptadas o rechazadas conservan las reglas
de edición existentes.

## Clientes y comprobantes

El formulario permite seleccionar un cliente existente o usar **+ Nuevo cliente**.
Se solicitan nombre, cédula, correo y teléfono; el cliente se crea al guardar la
cotización y queda disponible en el proyecto. Si se crea el cliente pero falla
el guardado de la cotización, el formulario conserva ese cliente para reintentar
sin crearlo nuevamente.

Al guardar se abre el detalle, donde **Comprobantes** permite adjuntar un PDF,
JPG o PNG de hasta 10 MB. Cada archivo puede corresponder a una cuota, separación,
abono extra, saldo o a la cotización general. Se pueden guardar varios archivos,
con observaciones opcionales, y descargarlos posteriormente. Se conserva nombre,
tamaño, fecha de carga, autor y una copia de la referencia del pago al adjuntarlo.
Esa referencia y el archivo permanecen si luego se cambia el cronograma.

Adjuntar un comprobante no confirma el pago ni modifica el saldo. Las cotizaciones
con comprobantes conservan su cliente y unidad y no se pueden eliminar, para
mantener la relación entre los soportes y su comprador.

Los archivos se almacenan como recursos `raw/authenticated` en Cloudinary. Se
descargan a través de la API del CRM, después de validar la sesión y la empresa,
y sin exponer la ubicación del almacenamiento en el listado. El almacenamiento
privado usa el mecanismo de acceso documentado por
[Cloudinary](https://cloudinary.com/documentation/control_access_to_media).

## Despliegue

Aplicar `backend/src/migrations/1789080000000-AddFlexibleQuotePayments.ts` antes
de desplegar el backend actualizado. Agrega `quotes.payment_plan` con valor
predeterminado `fixed` y `quotes.balance_due_date`, opcional. Los cronogramas
existentes permanecen guardados y se interpretan como planes mensuales.

Aplicar también `backend/src/migrations/1789081000000-AddQuoteReceipts.ts`, que
crea la tabla de comprobantes. La carga utiliza la configuración de Cloudinary
existente (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

Desde `backend`, en el entorno de despliegue correspondiente:

```sh
npm run migration:run
```

No usar sincronización automática del esquema. La migración se entrega con el
código y no se ejecuta contra la base de producción durante las pruebas locales.

## API

`POST /quotes/preview`, `POST /quotes` y `PATCH /quotes/:id` admiten:

```json
{
  "payment_plan": "fixed",
  "extra_installments": [
    { "concept": "extra", "amount": 19000000, "due_date": "2026-12-15" }
  ],
  "balance_due_date": "2028-01-15"
}
```

Para un plan `custom`, enviar todos los pagos pendientes de la inicial en
`custom_installments` con conceptos `cuota` o `extra`, y omitir o vaciar
`extra_installments`. Su suma debe equivaler a la inicial menos la separación.
Los valores pactados son pesos enteros positivos. Se permiten hasta 600 pagos
pactados, y hasta 600 mensualidades en el plan fijo.

En una edición parcial, omitir los arreglos conserva los pagos. Enviar `[]`
los vacía; un plan personalizado incompleto devuelve 400. Enviar
`balance_due_date: null` restablece la fecha automática.

La vista previa admite además `quote_id` para calcular con el precio guardado
de una cotización del mismo tenant. Este parámetro no cambia el precio de una
nueva cotización.

Comprobantes:

- `GET /quotes/:id/receipts`: listado de metadatos.
- `POST /quotes/:id/receipts`: multipart con `file` obligatorio,
  `installment_id` y `notes` opcionales.
- `GET /quotes/:id/receipts/:receiptId/file`: descarga autenticada.

Estas rutas admiten los roles Admin y Agent, con el mismo aislamiento por empresa
de las cotizaciones. La referencia al pago se obtiene del cronograma del servidor.

## Verificación

- Pruebas del cálculo: mensualidades con extras, planes variables, redondeos,
  totales, fechas, conceptos y pagos inválidos.
- Pruebas del servicio: creación, edición parcial, conservación del precio y
  cronograma, eliminación explícita de extras, estados y acceso por tenant.
- Validación de DTOs anidados y compilación de backend y frontend.
- Recorrido en Chrome con datos ficticios: creación, cambio de plan, ajustes,
  guardado, reapertura, edición, control de respuestas tardías y diseño móvil.
- Pruebas de comprobantes: archivos admitidos, validación multipart, sesión,
  aislamiento por empresa, persistencia de referencias y limpieza si falla el guardado.
- Recorrido de comprobantes en Chrome con base de datos y almacenamiento simulados:
  crear cliente, reintentar la cotización sin duplicarlo, subir un soporte,
  recuperar un fallo, reabrir, descargar y modificar el cronograma sin perder el soporte.
  La subida al proveedor real se debe verificar en el entorno de despliegue.

## Siguientes mejoras posibles

- Duplicar una cotización para comparar propuestas o generar una nueva versión.
- Plantillas de pagos por proyecto para reutilizar acuerdos frecuentes.
- Historial de revisiones y comparación entre versiones.
