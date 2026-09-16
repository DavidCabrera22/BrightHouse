import { IsEmail, IsString, IsOptional, IsUUID, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsUUID()
  role_id: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  project_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, description: 'SuperAdmin only - the tenant this belongs to' })
  @IsUUID()
  @IsOptional()
  tenant_id?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'SuperAdmin only - additional tenants the user can switch into',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  extra_tenant_ids?: string[];
}
