import { IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiProperty()
  @IsUUID()
  client_id: string;

  @ApiProperty()
  @IsUUID()
  agent_id: string;

  @ApiProperty()
  @IsNumber()
  sale_value: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
