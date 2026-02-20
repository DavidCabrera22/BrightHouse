import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalSignaturesService } from './digital-signatures.service';
import { DigitalSignaturesController } from './digital-signatures.controller';
import { DigitalSignature } from './entities/digital-signature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalSignature])],
  controllers: [DigitalSignaturesController],
  providers: [DigitalSignaturesService],
  exports: [DigitalSignaturesService],
})
export class DigitalSignaturesModule {}
