import { PartialType } from '@nestjs/swagger';
import { CreateDigitalSignatureDto } from './create-digital-signature.dto';

export class UpdateDigitalSignatureDto extends PartialType(CreateDigitalSignatureDto) {}
