import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(createDocumentDto.project_id, ctx);
    await this.tenantScope.assertReference(Unit, (createDocumentDto as any).unit_id, ctx);
    const document = this.documentRepository.create(createDocumentDto);
    return this.documentRepository.save(document);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Document, 'document', ctx)
      .leftJoinAndSelect('document.project', 'project')
      .leftJoinAndSelect('document.unit', 'unit')
      .leftJoinAndSelect('document.uploaded_by_user', 'uploaded_by_user')
      .getMany();
  }

  findByProject(projectId: string, unitId: string | undefined, ctx: TenantContext) {
    const qb = this.tenantScope
      .scoped(Document, 'document', ctx)
      .leftJoinAndSelect('document.uploaded_by_user', 'uploaded_by_user')
      .leftJoinAndSelect('document.unit', 'unit')
      .andWhere('document.project_id = :projectId', { projectId })
      .orderBy('document.created_at', 'DESC');

    if (unitId === 'none') {
      qb.andWhere('document.unit_id IS NULL');
    } else if (unitId) {
      qb.andWhere('document.unit_id = :unitId', { unitId });
    }

    return qb.getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const document = await this.tenantScope
      .scoped(Document, 'document', ctx)
      .leftJoinAndSelect('document.project', 'project')
      .leftJoinAndSelect('document.unit', 'unit')
      .leftJoinAndSelect('document.uploaded_by_user', 'uploaded_by_user')
      .andWhere('document.id = :id', { id })
      .getOne();

    if (!document) throw new NotFoundException(`Document with ID ${id} not found`);
    return document;
  }

  /**
   * Internal lookup used by the unit status pipeline. The caller has already
   * verified the unit belongs to the tenant, so this stays unscoped.
   */
  async findLatestByUnit(unitId: string) {
    return this.documentRepository.findOne({
      where: { unit_id: unitId },
      order: { created_at: 'DESC' },
      relations: ['project', 'unit'],
    });
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, ctx: TenantContext) {
    const document = await this.findOne(id, ctx);
    await this.tenantScope.assertProjectInTenant((updateDocumentDto as any).project_id, ctx);
    await this.tenantScope.assertReference(Unit, (updateDocumentDto as any).unit_id, ctx);
    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async remove(id: string, ctx: TenantContext) {
    const document = await this.findOne(id, ctx);
    return this.documentRepository.remove(document);
  }
}
