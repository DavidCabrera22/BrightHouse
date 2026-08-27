import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { AutomationsModule } from './automations.module';
import { AutomationsService } from './automations.service';
import { AutomationsRunner } from './automations.runner';
import { AutomationsController } from './automations.controller';
import { Automation } from './entities/automation.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantModule, TenantScopeService } from '../common/tenant';

/**
 * Compiles the real module definition with the database swapped out.
 *
 * A missing provider is invisible to the type checker and only surfaces when
 * the app boots, which in production means a failed deploy - this catches it in
 * CI instead.
 */
describe('AutomationsModule wiring', () => {
  it('resolves every provider the module declares', async () => {
    const moduleRef = await Test.createTestingModule({
      // TenantModule is @Global() in the running app; the test context needs it
      // imported explicitly to reproduce that.
      imports: [ConfigModule.forRoot({ isGlobal: true }), TenantModule, AutomationsModule],
    })
      .overrideProvider(getRepositoryToken(Automation))
      .useValue({})
      .overrideProvider(getRepositoryToken(AutomationRun))
      .useValue({})
      .overrideProvider(getRepositoryToken(Lead))
      .useValue({})
      .overrideProvider(getRepositoryToken(Tenant))
      .useValue({})
      .overrideProvider(DataSource)
      .useValue({})
      .overrideProvider(TenantScopeService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AutomationsService)).toBeDefined();
    expect(moduleRef.get(AutomationsRunner)).toBeDefined();
    expect(moduleRef.get(AutomationsController)).toBeDefined();

    await moduleRef.close();
  });
});
