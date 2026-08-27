import { IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Parámetros del cálculo. El precio de la unidad NO se recibe del cliente: se
 * lee de la unidad en el servidor, para que nadie cotice a un precio inventado.
 */
export class PreviewQuoteDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservation_amount?: number;

  // La columna es numeric(5,2) y el motor escala el porcentaje a dos decimales
  // antes de calcular: aceptar más decimales guardaría un valor distinto del
  // que se usó para armar el cronograma.
  @ApiProperty({ example: 30 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  down_payment_percent: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  installments_count: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  first_installment_date: string;

  @ApiPropertyOptional({ description: 'Por defecto, hoy en la zona del negocio' })
  @IsOptional()
  @IsDateString()
  quote_date?: string;
}
