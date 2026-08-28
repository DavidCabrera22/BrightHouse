import { IsUUID, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConvertToLeadDto {
  @ApiProperty({ description: 'Proyecto al que entra el lead' })
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional({ description: 'Por defecto, el nombre del contacto de la conversación' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
