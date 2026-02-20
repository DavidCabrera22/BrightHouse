import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitStatusHistoryService } from './unit-status-history.service';
import { UnitStatusHistoryController } from './unit-status-history.controller';
import { UnitStatusHistory } from './entities/unit-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnitStatusHistory])],
  controllers: [UnitStatusHistoryController],
  providers: [UnitStatusHistoryService],
  exports: [UnitStatusHistoryService],
})
export class UnitStatusHistoryModule {}
