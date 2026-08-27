import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UseInterceptors, UploadedFile, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as https from 'https';
import * as http from 'http';
import { join, resolve as resolvePath, sep } from 'path';
import { existsSync } from 'fs';

/** Legacy local document storage, kept readable but no longer publicly served. */
const UPLOADS_ROOT = join(__dirname, '..', '..', 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  zip: 'application/zip',
};

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Roles('Admin', 'Agent')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  @ApiConsumes('multipart/form-data')
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @CurrentTenant() tenant: TenantContext,
  ) {
    if (file) {
      createDocumentDto.file_url = await this.cloudinaryService.uploadFile(file, 'brighthouse/documents');
      createDocumentDto.original_name = file.originalname;
      createDocumentDto.file_size = file.size;
    }
    createDocumentDto.uploaded_by = req.user.userId;
    return this.documentsService.create(createDocumentDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('project_id') projectId?: string,
    @Query('unit_id') unitId?: string,
  ) {
    if (projectId) return this.documentsService.findByProject(projectId, unitId, tenant);
    return this.documentsService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.documentsService.findOne(id, tenant);
  }

  @Get(':id/file')
  @Roles('Admin', 'Agent')
  async serveFile(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const doc = await this.documentsService.findOne(id, tenant);
    let fileUrl = doc.file_url;
    if (!fileUrl) throw new NotFoundException('Este documento no tiene archivo adjunto');

    const ext = (doc.original_name || fileUrl).split('.').pop()?.toLowerCase() || '';
    const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';
    const filename = doc.original_name || `documento.${ext}`;

    // Old files were uploaded as resource_type 'image'; fix URL for non-image types
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!IMAGE_EXTS.includes(ext) && fileUrl.includes('/image/upload/')) {
      fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
    }

    // Documents stored before the move to Cloudinary keep a local /uploads path.
    // uploads/documents is no longer mounted as static, so this is now the only
    // way to reach them - and it runs after the tenant check above.
    if (!/^https?:/i.test(fileUrl)) {
      const relative = fileUrl.replace(/^\/?uploads\//, '');
      const absolute = resolvePath(UPLOADS_ROOT, relative);

      // Never let a stored path escape the uploads directory.
      if (!absolute.startsWith(UPLOADS_ROOT + sep) || !existsSync(absolute)) {
        throw new NotFoundException('Archivo no encontrado');
      }

      res.set('Content-Type', mimeType);
      res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      res.set('Cache-Control', 'private, max-age=3600');
      res.sendFile(absolute);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const client = fileUrl.startsWith('https') ? https : http;
      client.get(fileUrl, (upstream) => {
        console.log(`[Documents] Cloudinary response status=${upstream.statusCode} url=${fileUrl}`);
        if (upstream.statusCode && upstream.statusCode >= 400) {
          reject(new NotFoundException(`Archivo no encontrado en Cloudinary (HTTP ${upstream.statusCode}). URL: ${fileUrl}`));
          return;
        }
        res.set('Content-Type', mimeType);
        res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        res.set('Cache-Control', 'private, max-age=3600');
        upstream.pipe(res);
        upstream.on('end', resolve);
        upstream.on('error', reject);
      }).on('error', (err) => {
        console.error(`[Documents] Network error fetching url=${fileUrl}:`, err.message);
        reject(new InternalServerErrorException(err.message));
      });
    });
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.documentsService.update(id, updateDocumentDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.documentsService.remove(id, tenant);
  }
}
