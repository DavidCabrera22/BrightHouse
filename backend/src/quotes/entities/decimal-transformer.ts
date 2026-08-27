/**
 * `pg` devuelve los `numeric` como cadena. Sin esto, `total_value` llegaría
 * como "320000000.00" y cualquier suma en el servicio o en el PDF concatenaría
 * en vez de sumar.
 *
 * Vive en su propio archivo y no dentro de una entidad porque las dos se
 * importan mutuamente: si `quote-installment.entity.ts` lo tomara de
 * `quote.entity.ts`, el decorador @Column lo leería mientras ese módulo aún se
 * está cargando y quedaría `undefined` según qué archivo se importe primero.
 * Las relaciones sobreviven al ciclo porque TypeORM las difiere en una función
 * flecha; un valor suelto como este no.
 */
export const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};
