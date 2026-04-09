import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  create(createProjectDto: CreateProjectDto, tenantId?: string) {
    const project = this.projectRepository.create({ ...createProjectDto, tenant_id: tenantId ?? null });
    return this.projectRepository.save(project);
  }

  async findAll(tenantId?: string) {
    const where: any = tenantId ? { tenant_id: tenantId } : {};
    const projects = await this.projectRepository.find({ where });

    // Count units by status name for each project in a single query
    const counts: { project_id: string; status_name: string; count: string }[] =
      await this.unitRepository
        .createQueryBuilder('unit')
        .innerJoin('unit.current_status', 'status')
        .select('unit.project_id', 'project_id')
        .addSelect('status.name', 'status_name')
        .addSelect('COUNT(unit.id)', 'count')
        .groupBy('unit.project_id')
        .addGroupBy('status.name')
        .getRawMany();

    const countMap: Record<string, Record<string, number>> = {};
    for (const row of counts) {
      if (!countMap[row.project_id]) countMap[row.project_id] = {};
      countMap[row.project_id][row.status_name] = parseInt(row.count, 10);
    }

    return projects.map((p) => {
      const sc = countMap[p.id] || {};
      const units_available = sc['Disponible'] || 0;
      const units_process = (sc['Separado'] || 0) + (sc['En Proceso'] || 0);
      const units_sold = sc['Vendido'] || 0;
      const units_counted = units_available + units_process + units_sold;
      const sales_progress =
        units_counted > 0 ? Math.round(((units_process + units_sold) / units_counted) * 100) : 0;

      return { ...p, units_available, units_process, units_sold, sales_progress };
    });
  }

  async findOne(id: string) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string) {
    const project = await this.findOne(id);
    return this.projectRepository.remove(project);
  }
}
