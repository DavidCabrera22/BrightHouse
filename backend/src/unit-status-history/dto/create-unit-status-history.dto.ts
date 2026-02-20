import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitStatusHistoryDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  previous_status_id?: string;

  @ApiProperty()
  @IsUUID()
  new_status_id: string;

  @ApiProperty()
  @IsUUID()
  changed_by_user_id: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
