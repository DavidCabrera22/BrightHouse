import { IsString, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  plan?: string;

  @IsOptional() @IsString()
  whapi_token?: string;

  @IsOptional() @IsString()
  whapi_api_url?: string;

  @IsOptional() @IsString()
  instagram_token?: string;

  @IsOptional() @IsString()
  instagram_account_id?: string;

  @IsOptional() @IsString()
  default_project_id?: string;

  /** Asesor que se queda los leads que entran por el chatbot. */
  @IsOptional() @IsString()
  default_agent_id?: string;
}
