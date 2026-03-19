import { Module } from '@nestjs/common';
import { NovaService } from './nova.service';

@Module({
  providers: [NovaService],
  exports: [NovaService],
})
export class NovaModule {}
