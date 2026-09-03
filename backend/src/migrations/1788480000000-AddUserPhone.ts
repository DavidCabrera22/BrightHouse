import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teléfono de contacto del usuario del CRM.
 *
 * La tabla se cualifica con `public.` a propósito: Supabase trae su propia
 * `auth.users`, y un `ALTER TABLE "users"` sin esquema depende del search_path
 * de quien corra la migración.
 */
export class AddUserPhone1788480000000 implements MigrationInterface {
  name = 'AddUserPhone1788480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "phone" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public."users" DROP COLUMN IF EXISTS "phone"`);
  }
}
