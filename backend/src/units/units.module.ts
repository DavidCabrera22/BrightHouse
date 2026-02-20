import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit } from './entities/unit.entity';
import { UnitStatusesModule } from '../unit-statuses/unit-statuses.module';
import { UnitStatusHistoryModule } from '../unit-status-history/unit-status-history.module';
import { SalesModule } from '../sales/sales.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { DocumentsModule } from '../documents/documents.module';
import { DigitalSignaturesModule } from '../digital-signatures/digital-signatures.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit]),
    UnitStatusesModule,
    UnitStatusHistoryModule,
    SalesModule,
    CommissionsModule,
    DocumentsModule,
    DigitalSignaturesModule,
  ],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
