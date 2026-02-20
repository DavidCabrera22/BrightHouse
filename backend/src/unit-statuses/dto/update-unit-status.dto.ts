import { PartialType } from '@nestjs/swagger';
import { CreateUnitStatusDto } from './create-unit-status.dto';

export class UpdateUnitStatusDto extends PartialType(CreateUnitStatusDto) {}
