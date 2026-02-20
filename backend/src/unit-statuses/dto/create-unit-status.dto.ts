import { IsString, IsBoolean, IsInt, IsHexColor, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitStatusDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsHexColor()
  color_hex: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  triggers_commission?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  triggers_signature?: boolean;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  order_sequence?: number;
}
