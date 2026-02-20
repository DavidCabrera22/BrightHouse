import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty()
  @IsUUID()
  uploaded_by: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requires_signature?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
