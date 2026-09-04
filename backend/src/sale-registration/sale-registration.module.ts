import { Module } from '@nestjs/common';
import { SaleRegistrationService } from './sale-registration.service';
import { SaleRegistrationController } from './sale-registration.controller';
import { UnitsModule } from '../units/units.module';
import { ClientsModule } from '../clients/clients.module';
import { SalesModule } from '../sales/sales.module';

/**
 * Solo orquesta: no tiene entidades propias ni repositorios.
 *
 * Depende de Units, Clients y Sales, y ninguno depende de él, así que la
 * dependencia circular que habría entre Sales y Units no llega a existir.
 */
@Module({
  imports: [UnitsModule, ClientsModule, SalesModule],
  controllers: [SaleRegistrationController],
  providers: [SaleRegistrationService],
})
export class SaleRegistrationModule {}
