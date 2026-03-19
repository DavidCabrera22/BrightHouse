import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lead_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_agent_id?: string;

  @ApiProperty({ example: 'whatsapp' })
  @IsString()
  channel: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp_waid?: string;
}
