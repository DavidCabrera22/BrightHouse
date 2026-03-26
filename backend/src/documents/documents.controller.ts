import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/documents',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `doc-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  @ApiConsumes('multipart/form-data')
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (file) {
      createDocumentDto.file_url = `/uploads/documents/${file.filename}`;
      createDocumentDto.original_name = file.originalname;
      createDocumentDto.file_size = file.size;
    }
    createDocumentDto.uploaded_by = req.user.userId;
    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@Query('project_id') projectId?: string, @Query('unit_id') unitId?: string) {
    if (projectId) return this.documentsService.findByProject(projectId, unitId);
    return this.documentsService.findAll();
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
