import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignature } from './entities/digital-signature.entity';
import { Document } from '../documents/entities/document.entity';
import { User } from '../users/entities/user.entity';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class DigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignature)
    private readonly signatureRepository: Repository<DigitalSignature>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * System-level create, triggered by a unit status change. The caller has
   * already verified the unit (and therefore the document) belongs to the
   * tenant. Request-driven creates must use `createForTenant` instead.
   */
  create(createDto: CreateDigitalSignatureDto) {
    const signature = this.signatureRepository.create(createDto);
    return this.signatureRepository.save(signature);
  }

  async createForTenant(createDto: CreateDigitalSignatureDto, ctx: TenantContext) {
    await this.tenantScope.assertReference(Document, createDto.document_id, ctx);
    await this.tenantScope.assertReference(User, createDto.signed_by_user_id, ctx);
    return this.create(createDto);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(DigitalSignature, 'signature', ctx)
      .leftJoinAndSelect('signature.document', 'document')
      .leftJoinAndSelect('signature.signed_by_user', 'signed_by_user')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const signature = await this.tenantScope
      .scoped(DigitalSignature, 'signature', ctx)
      .leftJoinAndSelect('signature.document', 'document')
      .leftJoinAndSelect('signature.signed_by_user', 'signed_by_user')
      .andWhere('signature.id = :id', { id })
      .getOne();

    if (!signature) {
      throw new NotFoundException(`DigitalSignature with ID ${id} not found`);
    }
    return signature;
  }

  async update(id: string, updateDto: UpdateDigitalSignatureDto, ctx: TenantContext) {
    const signature = await this.findOne(id, ctx);
    await this.tenantScope.assertReference(Document, (updateDto as any).document_id, ctx);
    Object.assign(signature, updateDto);
    return this.signatureRepository.save(signature);
  }

  async remove(id: string, ctx: TenantContext) {
    const signature = await this.findOne(id, ctx);
    return this.signatureRepository.remove(signature);
  }
}
