import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPlan } from '../quote-calculator';

export class PlannedPaymentDto {
  @ApiProperty({ enum: ['cuota', 'extra'] })
  @IsIn(['cuota', 'extra'])
  concept: 'cuota' | 'extra';

  @ApiProperty({ description: 'Valor pactado en pesos enteros' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString({ strict: true })
  due_date: string;
}

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
  @Max(600)
  installments_count: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  first_installment_date: string;

  @ApiPropertyOptional({
    description: 'Por defecto, hoy en la zona del negocio',
  })
  @IsOptional()
  @IsDateString()
  quote_date?: string;

  @ApiPropertyOptional({ enum: ['fixed', 'custom'], default: 'fixed' })
  @IsOptional()
  @IsIn(['fixed', 'custom'])
  payment_plan?: PaymentPlan;

  @ApiPropertyOptional({ type: [PlannedPaymentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @ValidateNested({ each: true })
  @Type(() => PlannedPaymentDto)
  extra_installments?: PlannedPaymentDto[];

  @ApiPropertyOptional({ type: [PlannedPaymentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @ValidateNested({ each: true })
  @Type(() => PlannedPaymentDto)
  custom_installments?: PlannedPaymentDto[];

  @ApiPropertyOptional({
    description: 'Fecha del saldo final; null usa la fecha automática',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  balance_due_date?: string | null;
}

/** Solo la vista previa de edición acepta el ID para usar el precio guardado. */
export class QuotePreviewRequestDto extends PreviewQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quote_id?: string;
}
