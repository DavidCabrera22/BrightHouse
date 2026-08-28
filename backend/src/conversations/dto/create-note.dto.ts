import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ description: 'Nota interna: solo se ve en el CRM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Quién la escribe; por defecto "Asesor"' })
  @IsOptional()
  @IsString()
  author?: string;
}
