import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { SaleRegistrationModule } from './sale-registration.module';
import { SaleRegistrationService } from './sale-registration.service';
import { SaleRegistrationController } from './sale-registration.controller';
import { TenantModule, TenantScopeService } from '../common/tenant';

import { Unit } from '../units/entities/unit.entity';
import { UnitStatus } from '../unit-statuses/entities/unit-status.entity';
import { UnitStatusHistory } from '../unit-status-history/entities/unit-status-history.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Commission } from '../commissions/entities/commission.entity';
import { Document } from '../documents/entities/document.entity';
import { DigitalSignature } from '../digital-signatures/entities/digital-signature.entity';
import { Client } from '../clients/entities/client.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

/**
 * Compila el módulo real con la base de datos sustituida.
 *
 * Este módulo solo orquesta: todo lo que usa viene inyectado de Units, Clients
 * y Sales. Un proveedor mal cableado es invisible para el compilador y solo
 * aparecería al arrancar la app, que en producción significa un despliegue
 * roto. Además fija que la dependencia entre Sales y Units no se vuelva
 * circular: si alguien la introduce, esto deja de compilar.
 */
describe('SaleRegistrationModule wiring', () => {
  it('resuelve todo lo que el módulo declara', async () => {
    const moduleRef = await Test.createTestingModule({
      // TenantModule, AuditLogsModule y CloudinaryModule son @Global() en la app; el
      // contexto de prueba no los hereda y hay que importarlos explícitamente.
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TenantModule,
        AuditLogsModule,
        CloudinaryModule,
        SaleRegistrationModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Unit))
      .useValue({})
      .overrideProvider(getRepositoryToken(UnitStatus))
      .useValue({})
      .overrideProvider(getRepositoryToken(UnitStatusHistory))
      .useValue({})
      .overrideProvider(getRepositoryToken(Sale))
      .useValue({})
      .overrideProvider(getRepositoryToken(Commission))
      .useValue({})
      .overrideProvider(getRepositoryToken(Document))
      .useValue({})
      .overrideProvider(getRepositoryToken(DigitalSignature))
      .useValue({})
      .overrideProvider(getRepositoryToken(Client))
      .useValue({})
      .overrideProvider(getRepositoryToken(AuditLog))
      .useValue({})
      .overrideProvider(DataSource)
      .useValue({})
      .overrideProvider(TenantScopeService)
      .useValue({})
      .compile();

    expect(moduleRef.get(SaleRegistrationService)).toBeDefined();
    expect(moduleRef.get(SaleRegistrationController)).toBeDefined();
  });
});
