import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un usuario puede operar en más de un tenant.
 *
 * `users.tenant_id` sigue siendo el principal; esta tabla guarda los demás. Es
 * `character varying` y no `uuid` por coherencia con `users.tenant_id`, que es
 * contra lo que se compara al filtrar usuarios por tenant.
 */
export class AddUserTenants1789200000000 implements MigrationInterface {
  name = 'AddUserTenants1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_tenants" (
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "tenant_id" character varying NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      PRIMARY KEY ("user_id", "tenant_id")
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_tenants_tenant" ON "user_tenants" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tenants"`);
  }
}
