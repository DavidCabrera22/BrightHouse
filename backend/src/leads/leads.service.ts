import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  create(createLeadDto: CreateLeadDto) {
    const lead = this.leadRepository.create(createLeadDto);
    return this.leadRepository.save(lead);
  }

  findAll() {
    return this.leadRepository.find({ relations: ['project', 'assigned_agent'] });
  }

  async findOne(id: string) {
    const lead = await this.leadRepository.findOne({ 
      where: { id },
      relations: ['project', 'assigned_agent'] 
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    Object.assign(lead, updateLeadDto);
    return this.leadRepository.save(lead);
  }

  async remove(id: string) {
    const lead = await this.findOne(id);
    return this.leadRepository.remove(lead);
  }

  async findOrCreateByPhone(
    phone: string,
    projectId: string,
    name?: string,
  ): Promise<{ lead: Lead; created: boolean }> {
    const existing = await this.leadRepository.findOne({ where: { phone } });
    if (existing) return { lead: existing, created: false };

    const lead = this.leadRepository.create({
      phone,
      name: name || phone,
      project_id: projectId,
      source: 'whatsapp',
      status: 'new',
    });
    const saved = await this.leadRepository.save(lead);
    return { lead: saved, created: true };
  }

  async updateFromNova(
    id: string,
    data: { name?: string; interested_in?: string; ai_score?: number; priority?: string },
  ): Promise<void> {
    const updates: Partial<Lead> = {};
    if (data.name) updates.name = data.name;
    if (data.interested_in) updates.interested_in = data.interested_in;
    if (data.ai_score !== undefined) updates.ai_score = data.ai_score;
    if (data.priority) updates.priority = data.priority;
    if (Object.keys(updates).length > 0) {
      await this.leadRepository.update(id, updates);
    }
  }
}
