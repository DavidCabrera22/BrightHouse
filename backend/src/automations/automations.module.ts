import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AutomationsService } from './automations.service';
import { AutomationsRunner } from './automations.runner';
import { AutomationsController } from './automations.controller';
import { WhapiService } from '../webhooks/whapi.service';

@Module({
  imports: [TypeOrmModule.forFeature([Automation, AutomationRun, Lead, Tenant])],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationsRunner, WhapiService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
