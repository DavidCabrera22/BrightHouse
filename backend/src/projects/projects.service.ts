import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  create(createProjectDto: CreateProjectDto, ctx: TenantContext) {
    // A tenant user can only create inside its own tenant; SuperAdmin may pass one.
    const tenantId = ctx.isSuperAdmin
      ? (createProjectDto.tenant_id ?? null)
      : ctx.tenantId;
    const project = this.projectRepository.create({ ...createProjectDto, tenant_id: tenantId });
    return this.projectRepository.save(project);
  }

  async findAll(ctx: TenantContext) {
    const projects = await this.tenantScope.scoped(Project, 'project', ctx).getMany();
    return this.withUnitCounts(projects);
  }

  /**
   * Public marketing catalog - deliberately unscoped, it powers the logged-out
   * landing page. Kept as its own method so no request path can reach the
   * cross-tenant listing by leaving a tenant argument out.
   */
  async findAllPublic() {
    const projects = await this.projectRepository.find();
    return this.withUnitCounts(projects);
  }

  private async withUnitCounts(projects: Project[]) {
    if (projects.length === 0) return [];

    // Count units by status name for the given projects in a single query
    const counts: { project_id: string; status_name: string; count: string }[] =
      await this.unitRepository
        .createQueryBuilder('unit')
        .innerJoin('unit.current_status', 'status')
        .select('unit.project_id', 'project_id')
        .addSelect('status.name', 'status_name')
        .addSelect('COUNT(unit.id)', 'count')
        .where('unit.project_id IN (:...projectIds)', { projectIds: projects.map((p) => p.id) })
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

  async findOne(id: string, ctx: TenantContext) {
    const project = await this.tenantScope
      .scoped(Project, 'project', ctx)
      .andWhere('project.id = :id', { id })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, ctx: TenantContext) {
    const project = await this.findOne(id, ctx);
    // tenant_id is never client-controlled; only SuperAdmin can move a project.
    const { tenant_id, ...safe } = updateProjectDto as any;
    Object.assign(project, safe);
    if (ctx.isSuperAdmin && tenant_id !== undefined) {
      project.tenant_id = tenant_id;
    }
    return this.projectRepository.save(project);
  }

  async remove(id: string, ctx: TenantContext) {
    const project = await this.findOne(id, ctx);
    return this.projectRepository.remove(project);
  }
}
