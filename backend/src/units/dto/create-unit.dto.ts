import { IsString, IsNotEmpty, IsNumber, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  tower: string;

  @ApiProperty()
  @IsString()
  floor: string;

  @ApiProperty()
  @IsNumber()
  area: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsUUID()
  current_status_id: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assigned_agent_id?: string;
}
