import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(createCampaignDto.project_id, ctx);
    const campaign = this.campaignRepository.create(createCampaignDto);
    return this.campaignRepository.save(campaign);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Campaign, 'campaign', ctx)
      .leftJoinAndSelect('campaign.project', 'project')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const campaign = await this.tenantScope
      .scoped(Campaign, 'campaign', ctx)
      .leftJoinAndSelect('campaign.project', 'project')
      .andWhere('campaign.id = :id', { id })
      .getOne();

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto, ctx: TenantContext) {
    const campaign = await this.findOne(id, ctx);
    await this.tenantScope.assertProjectInTenant((updateCampaignDto as any).project_id, ctx);
    Object.assign(campaign, updateCampaignDto);
    return this.campaignRepository.save(campaign);
  }

  async remove(id: string, ctx: TenantContext) {
    const campaign = await this.findOne(id, ctx);
    return this.campaignRepository.remove(campaign);
  }
}
