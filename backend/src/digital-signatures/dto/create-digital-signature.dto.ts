import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDigitalSignatureDto {
  @ApiProperty()
  @IsUUID()
  document_id: string;

  @ApiProperty()
  @IsUUID()
  signed_by_user_id: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  signature_type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ip_address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  device_info?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hash_sha256?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  verification_code?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
