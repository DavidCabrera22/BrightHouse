import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del módulo de automatizaciones.
 *
 * El módulo ya está cargado en `app.module.ts` pero sus tablas nunca se
 * crearon en producción. Va aparte de `AddQuotes` porque es otra función.
 *
 * Escrita a mano y no generada: mientras las tablas de cotizaciones no estén
 * aplicadas, `migration:generate` las volvería a incluir aquí y quedarían
 * declaradas dos veces.
 */
export class AddAutomations1787860400000 implements MigrationInterface {
  name = 'AddAutomations1787860400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "automations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'draft', "trigger_type" character varying NOT NULL, "trigger_config" jsonb NOT NULL DEFAULT '{}', "action_type" character varying NOT NULL, "action_config" jsonb NOT NULL DEFAULT '{}', "runs_count" integer NOT NULL DEFAULT '0', "last_run_at" TIMESTAMP, "last_error" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_34c2cc382fc780ea36f7c478192" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "automation_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "automation_id" uuid NOT NULL, "lead_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'success', "detail" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_automation_run_lead" UNIQUE ("automation_id", "lead_id"), CONSTRAINT "PK_273137fa78ff9340128ab98445f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "automations" ADD CONSTRAINT "FK_0d1cbb3a49936b564f85d5af72c" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "automation_runs" ADD CONSTRAINT "FK_a61ba11dea20d2eb0166b97e5a8" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "automation_runs" ADD CONSTRAINT "FK_d9877e45a24885328d16364cc2d" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "automation_runs" DROP CONSTRAINT "FK_d9877e45a24885328d16364cc2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "automation_runs" DROP CONSTRAINT "FK_a61ba11dea20d2eb0166b97e5a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "automations" DROP CONSTRAINT "FK_0d1cbb3a49936b564f85d5af72c"`,
    );
    await queryRunner.query(`DROP TABLE "automation_runs"`);
    await queryRunner.query(`DROP TABLE "automations"`);
  }
}
