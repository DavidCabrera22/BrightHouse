import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleVisitDto {
  @ApiProperty({ example: '2026-08-30T15:00', description: 'Fecha y hora de la visita' })
  @IsString()
  @IsNotEmpty()
  scheduled_at: string;

  @ApiPropertyOptional({ description: 'Comentario del asesor sobre la visita' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;
}
