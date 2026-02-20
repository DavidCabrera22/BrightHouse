import { IsString, IsNotEmpty, IsNumber, IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  budget: number;

  @ApiProperty()
  @IsDateString()
  start_date: string;

  @ApiProperty()
  @IsDateString()
  end_date: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cost_per_lead?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  leads_generated?: number;
}
