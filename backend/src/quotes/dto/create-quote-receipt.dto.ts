import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateQuoteReceiptDto {
  @ApiPropertyOptional({ description: 'Cuota del cronograma; omitir para un comprobante general' })
  @IsOptional()
  @IsUUID()
  installment_id?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
