import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  unit_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_type: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  file_url?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  original_name?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  file_size?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  uploaded_by?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requires_signature?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
