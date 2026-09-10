import { BadRequestException } from '@nestjs/common';

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/** El tipo se comprueba en los bytes; no se confía solo en el nombre o el MIME. */
export function validateReceiptFile(file?: Express.Multer.File): { mime: string; extension: string } {
  if (!file?.buffer?.length) throw new BadRequestException('Selecciona un comprobante para subir');
  if (file.buffer.length > MAX_RECEIPT_BYTES) {
    throw new BadRequestException('El comprobante no puede superar 10 MB');
  }
  const bytes = file.buffer;
  let detected: { mime: string; extension: string };
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') {
    detected = { mime: 'application/pdf', extension: 'pdf' };
  } else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detected = { mime: 'image/jpeg', extension: 'jpg' };
  } else if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    detected = { mime: 'image/png', extension: 'png' };
  } else {
    throw new BadRequestException('El comprobante debe ser un archivo PDF, JPG o PNG');
  }
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  const allowed = detected.extension === 'jpg' ? ['jpg', 'jpeg'] : [detected.extension];
  if (!allowed.includes(extension) || (file.mimetype && file.mimetype !== detected.mime && file.mimetype !== 'application/octet-stream')) {
    throw new BadRequestException('El contenido del comprobante no coincide con su tipo de archivo');
  }
  return detected;
}
