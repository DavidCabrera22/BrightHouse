import { Global, Module } from '@nestjs/common';
import { TenantScopeService } from './tenant-scope.service';

/**
 * Global so every feature module can enforce isolation without adding an
 * import - forgetting the import must never be the reason a table leaks.
 */
@Global()
@Module({
  providers: [TenantScopeService],
  exports: [TenantScopeService],
})
export class TenantModule {}
