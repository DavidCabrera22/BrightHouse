import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitStatusesService } from './unit-statuses.service';
import { UnitStatusesController } from './unit-statuses.controller';
import { UnitStatus } from './entities/unit-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnitStatus])],
  controllers: [UnitStatusesController],
  providers: [UnitStatusesService],
  exports: [UnitStatusesService],
})
export class UnitStatusesModule {}
