import { IsEmail, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

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
}
