import { IsNumber, IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommissionDto {
  @ApiProperty()
  @IsUUID()
  sale_id: string;

  @ApiProperty()
  @IsNumber()
  agent_percentage: number;

  @ApiProperty()
  @IsNumber()
  platform_percentage: number;

  @ApiProperty()
  @IsNumber()
  total_commission: number;

  @ApiProperty()
  @IsNumber()
  agent_commission: number;

  @ApiProperty()
  @IsNumber()
  platform_commission: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
