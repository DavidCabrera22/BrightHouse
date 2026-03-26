import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitStatusHistoryService } from '../unit-status-history/unit-status-history.service';
import { UnitStatusesService } from '../unit-statuses/unit-statuses.service';
import { SalesService } from '../sales/sales.service';
import { CommissionsService } from '../commissions/commissions.service';
import { DocumentsService } from '../documents/documents.service';
import { DigitalSignaturesService } from '../digital-signatures/digital-signatures.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitStatusHistoryService: UnitStatusHistoryService,
    private readonly unitStatusesService: UnitStatusesService,
    private readonly salesService: SalesService,
    private readonly commissionsService: CommissionsService,
    private readonly documentsService: DocumentsService,
    private readonly digitalSignaturesService: DigitalSignaturesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  create(createUnitDto: CreateUnitDto) {
    const unit = this.unitRepository.create(createUnitDto);
    return this.unitRepository.save(unit);
  }

  findAll(projectId?: string) {
    return this.unitRepository.find({
      where: projectId ? { project_id: projectId } : {},
      relations: ['project', 'current_status', 'assigned_agent'],
    });
  }

  async findOne(id: string) {
    const unit = await this.unitRepository.findOne({ 
      where: { id },
      relations: ['project', 'current_status', 'assigned_agent'] 
    });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async update(id: string, updateUnitDto: UpdateUnitDto) {
    await this.unitRepository.update(id, updateUnitDto as any);
    return this.findOne(id);
  }

  async changeStatus(id: string, newStatusId: string, userId: string, notes?: string) {
    const unit = await this.findOne(id);
    const oldStatusId = unit.current_status_id;

    if (oldStatusId === newStatusId) {
      return unit;
    }

    const newStatus = await this.unitStatusesService.findOne(newStatusId);
    
    // Update Unit
    unit.current_status = newStatus;
    unit.current_status_id = newStatusId;
    const updatedUnit = await this.unitRepository.save(unit);

    // 1. Create History
    try {
      await this.unitStatusHistoryService.create({
        unit_id: id,
        previous_status_id: oldStatusId,
        new_status_id: newStatusId,
        changed_by_user_id: userId,
        notes,
      });
    } catch (e) {
      this.logger.warn(`Could not create status history for unit ${id}: ${e.message}`);
    }

    // 2. Trigger Commission
    if (newStatus.triggers_commission) {
      try {
        const sale = await this.salesService.findByUnit(id);
        if (sale) {
          const agentCommission = sale.sale_value * 0.03;
          const platformCommission = sale.sale_value * 0.02;
          await this.commissionsService.create({
            sale_id: sale.id,
            agent_percentage: 3,
            platform_percentage: 2,
            total_commission: agentCommission + platformCommission,
            agent_commission: agentCommission,
            platform_commission: platformCommission,
            status: 'Projected',
          });
          await this.auditLogsService.log(userId, 'CREATE_COMMISSION', 'Commission', sale.id, null, { sale_id: sale.id });
        }
      } catch (e) {
        this.logger.warn(`Could not trigger commission for unit ${id}: ${e.message}`);
      }
    }

    // 3. Trigger Signature
    if (newStatus.triggers_signature) {
      try {
        const document = await this.documentsService.findLatestByUnit(id);
        if (document) {
          await this.digitalSignaturesService.create({
            document_id: document.id,
            signed_by_user_id: userId,
            status: 'pending',
          });
          await this.auditLogsService.log(userId, 'CREATE_SIGNATURE_REQUEST', 'DigitalSignature', document.id, null, { document_id: document.id });
        }
      } catch (e) {
        this.logger.warn(`Could not trigger signature for unit ${id}: ${e.message}`);
      }
    }

    // 4. Audit Log
    try {
      await this.auditLogsService.log(userId, 'CHANGE_STATUS', 'Unit', id, { status: oldStatusId }, { status: newStatusId });
    } catch (e) {
      this.logger.warn(`Could not create audit log for unit ${id}: ${e.message}`);
    }

    return updatedUnit;
  }

  async remove(id: string) {
    const unit = await this.findOne(id);
    return this.unitRepository.remove(unit);
  }
}
