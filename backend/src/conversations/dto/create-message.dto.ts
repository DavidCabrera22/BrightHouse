import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ example: 'user', enum: ['user', 'agent', 'bot'] })
  @IsString()
  sender_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sender_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sender_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp_message_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: object;
}
