import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovaService } from './nova.service';
import { InventorySummaryService } from './inventory-summary.service';
import { Unit } from '../units/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit])],
  providers: [NovaService, InventorySummaryService],
  exports: [NovaService],
})
export class NovaModule {}
