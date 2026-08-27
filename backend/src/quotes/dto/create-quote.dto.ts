import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreviewQuoteDto } from './preview-quote.dto';

export class CreateQuoteDto extends PreviewQuoteDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsUUID()
  client_id: string;

  @ApiPropertyOptional({ default: 15, description: 'Días de vigencia desde la fecha de cotización' })
  @IsOptional()
  @IsInt()
  @Min(1)
  valid_days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
