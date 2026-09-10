import { MAX_RECEIPT_BYTES, validateReceiptFile } from './quote-receipt-file';

const file = (originalname: string, buffer: Buffer, mimetype = 'application/octet-stream') =>
  ({ originalname, buffer, mimetype } as Express.Multer.File);

describe('archivos de comprobantes', () => {
  it.each([
    ['soporte.pdf', Buffer.from('%PDF-1.7'), 'application/pdf'],
    ['foto.JPG', Buffer.from([255, 216, 255, 224]), 'image/jpeg'],
    ['foto.jpeg', Buffer.from([255, 216, 255, 224]), 'image/jpeg'],
    ['captura.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'],
  ])('acepta %s según los bytes del archivo', (name, buffer, mime) => {
    expect(validateReceiptFile(file(name, buffer)).mime).toBe(mime);
  });

  it('exige un archivo con contenido y un tamaño máximo de 10 MB', () => {
    expect(() => validateReceiptFile()).toThrow(/selecciona/i);
    expect(() => validateReceiptFile(file('vacio.pdf', Buffer.alloc(0)))).toThrow(/selecciona/i);
    expect(() => validateReceiptFile(file('grande.pdf', Buffer.alloc(MAX_RECEIPT_BYTES + 1)))).toThrow(/10 MB/);
  });

  it('rechaza ejecutables, archivos renombrados y tipos MIME que no coinciden', () => {
    expect(() => validateReceiptFile(file('ejecutable.pdf', Buffer.from('MZ')))).toThrow(/PDF, JPG o PNG/);
    expect(() => validateReceiptFile(file('archivo.html', Buffer.from('%PDF-1.7')))).toThrow(/no coincide/);
    expect(() => validateReceiptFile(file('archivo.pdf', Buffer.from('%PDF-1.7'), 'text/html'))).toThrow(/no coincide/);
  });
});
