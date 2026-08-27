import { DataSource } from 'typeorm';
import { Quote } from './quote.entity';
import { QuoteInstallment } from './quote-installment.entity';

/**
 * `Quote` y `QuoteInstallment` se importan entre sí (la relación `installments`
 * en una y `quote` en la otra), así que cualquier valor compartido que no esté
 * en su propio archivo queda a merced de cuál de las dos cargue primero. Esta
 * prueba no le pide nada a ese mecanismo de módulos: solo confirma el
 * comportamiento observable que le importa al resto del sistema - que los
 * montos vuelven como número, no como cadena - construyendo la metadata real
 * (sin conexión a base de datos, igual que tenant-scope.spec.ts).
 */
describe('decimalTransformer wiring on Quote and QuoteInstallment', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    });
    await (dataSource as any).buildMetadatas();
  });

  it.each([
    ['unit_price', '320000000.00', 320000000],
    ['total_value', '320000000.00', 320000000],
    ['down_payment_percent', '30.00', 30],
  ])('Quote.%s parses the numeric string Postgres would return', (property, raw, expected) => {
    const column = dataSource.getMetadata(Quote).findColumnWithPropertyName(property as string);
    expect((column as any).transformer?.from(raw)).toBe(expected);
  });

  it('QuoteInstallment.amount parses the numeric string Postgres would return', () => {
    const column = dataSource.getMetadata(QuoteInstallment).findColumnWithPropertyName('amount');
    expect((column as any).transformer?.from('1500000.50')).toBe(1500000.5);
  });

  it('passes null through untouched on read, and numbers through untouched on write', () => {
    const column = dataSource.getMetadata(Quote).findColumnWithPropertyName('discount');
    expect((column as any).transformer?.from(null)).toBeNull();
    expect((column as any).transformer?.to(42)).toBe(42);
  });
});
