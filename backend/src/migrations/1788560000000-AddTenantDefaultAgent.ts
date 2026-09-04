import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Quién se queda los leads que crea el chatbot de cada tenant.
 *
 * Hasta ahora entraban sin dueño y alguien tenía que repartirlos a mano. Los
 * leads que un asesor crea desde el CRM ya quedan a su nombre; esto cierra la
 * otra mitad, la que llega sola por WhatsApp o Instagram.
 *
 * Es `character varying` y no `uuid` por coherencia con `default_project_id` y
 * `tenant_id`, que ya son varchar en esta tabla.
 */
export class AddTenantDefaultAgent1788560000000 implements MigrationInterface {
  name = 'AddTenantDefaultAgent1788560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public."tenants" ADD COLUMN IF NOT EXISTS "default_agent_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public."tenants" DROP COLUMN IF EXISTS "default_agent_id"`,
    );
  }
}
