import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('public')
  findAllPublic() {
    return this.projectsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        location: { type: 'string' },
        status: { type: 'string' },
        total_units: { type: 'integer' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(@Body() createProjectDto: CreateProjectDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      createProjectDto.image = await this.cloudinaryService.uploadFile(file, 'brighthouse/projects');
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
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      updateProjectDto.image = await this.cloudinaryService.uploadFile(file, 'brighthouse/projects');
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
