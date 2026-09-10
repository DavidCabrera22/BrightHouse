import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'raw' },
        (error, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  async uploadPrivateFile(file: Express.Multer.File, folder: string, extension: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'raw', type: 'authenticated', public_id: `${randomUUID()}.${extension}`, overwrite: false },
        (error, result: UploadApiResponse) => {
          if (error || !result?.public_id) return reject(error ?? new Error('Upload failed'));
          resolve(result.public_id);
        },
      );
      stream.end(file.buffer);
    });
  }

  async deletePrivateFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true });
  }

  async downloadPrivateFile(publicId: string): Promise<Buffer> {
    // Los archivos raw incluyen su extensión en el public_id.
    const url = cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error('Download failed');
    return Buffer.from(await response.arrayBuffer());
  }
}
