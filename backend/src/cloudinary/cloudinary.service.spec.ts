import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

describe('almacenamiento privado de comprobantes', () => {
  let service: CloudinaryService;
  beforeEach(() => {
    jest.spyOn(cloudinary, 'config').mockReturnValue({});
    service = new CloudinaryService({ get: () => 'test-value' } as unknown as ConfigService);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sube el archivo como autenticado, con nombre generado y sin sobrescribir', async () => {
    const file = { buffer: Buffer.from('%PDF-1.4') } as Express.Multer.File;
    const end = jest.fn();
    const upload = jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((options: any, callback?: any) => {
      callback(null, { public_id: 'private/generated.pdf' });
      return { end } as any;
    });
    expect(await service.uploadPrivateFile(file, 'receipts/quote-1', 'pdf')).toBe('private/generated.pdf');
    expect(upload.mock.calls[0][0]).toMatchObject({
      folder: 'receipts/quote-1', resource_type: 'raw', type: 'authenticated', overwrite: false,
      public_id: expect.stringMatching(/^[0-9a-f-]+\.pdf$/),
    });
    expect(end).toHaveBeenCalledWith(file.buffer);
  });

  it('firma una descarga temporal y devuelve los bytes, sin exponer la URL', async () => {
    const signed = jest.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://example.invalid/signed');
    const download = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('%PDF-1.4'));
    expect(await service.downloadPrivateFile('private/generated.pdf')).toEqual(Buffer.from('%PDF-1.4'));
    expect(signed).toHaveBeenCalledWith('private/generated.pdf', '', expect.objectContaining({
      resource_type: 'raw', type: 'authenticated', expires_at: expect.any(Number),
    }));
    expect(signed.mock.calls[0][2].expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(download).toHaveBeenCalledWith('https://example.invalid/signed', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('rechaza una descarga fallida y limpia archivos del mismo tipo privado', async () => {
    jest.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://example.invalid/signed');
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    await expect(service.downloadPrivateFile('private/generated.pdf')).rejects.toThrow('Download failed');
    const destroy = jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    await service.deletePrivateFile('private/generated.pdf');
    expect(destroy).toHaveBeenCalledWith('private/generated.pdf', { resource_type: 'raw', type: 'authenticated', invalidate: true });
  });
});
