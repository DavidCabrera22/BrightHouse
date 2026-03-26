import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('public')
  findAllPublic() {
    return this.projectsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/projects',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        location: { type: 'string' },
        status: { type: 'string' },
        total_units: { type: 'integer' },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  create(@Body() createProjectDto: CreateProjectDto, @UploadedFile() file?: Express.Multer.File) {
    console.log('Received Create Project Request');
    console.log('Body:', createProjectDto);
    console.log('File:', file);

    if (file) {
        createProjectDto.image = `/uploads/projects/${file.filename}`;
    }
    return this.projectsService.create(createProjectDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles('Admin', 'Agent')
  findAll() {
    return this.projectsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/projects',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  @ApiConsumes('multipart/form-data')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      updateProjectDto.image = `/uploads/projects/${file.filename}`;
    }
    return this.projectsService.update(id, updateProjectDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
