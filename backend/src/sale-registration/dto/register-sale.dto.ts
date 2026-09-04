import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Todo lo que hace falta para cerrar una venta en un solo envío: el comprador,
 * la unidad y en qué estado queda.
 *
 * El `project_id` NO viaja aquí a propósito: se deduce de la unidad. Si lo
 * mandara el navegador, se podría registrar un cliente en un proyecto distinto
 * al del apartamento que está comprando.
 */
export class RegisterSaleDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  /** El estado al que pasa la unidad. Solo el que tenga `triggers_commission` genera comisión. */
  @ApiProperty()
  @IsUUID()
  new_status_id: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  sale_value: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_name: string;

  @ApiProperty({ description: 'Cédula del comprador. Identifica al cliente entre ventas.' })
  @IsString()
  @IsNotEmpty()
  client_document_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_phone: string;

  @ApiProperty()
  @IsEmail()
  client_email: string;

  /** A quién se le atribuye la venta. Sin esto, a quien la registra. */
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  agent_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
