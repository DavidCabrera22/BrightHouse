import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas de cotizaciones.
 *
 * El generador incluía además `automations` y `automation_runs`, que tampoco
 * existen en producción: se quitaron de aquí porque son de otra función y
 * merecen su propia migración.
 */
export class AddQuotes1787860306997 implements MigrationInterface {
  name = 'AddQuotes1787860306997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "quote_installments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quote_id" uuid NOT NULL, "number" integer NOT NULL, "concept" character varying NOT NULL, "amount" numeric(15,2) NOT NULL, "due_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1082b2d2d1d7b43c0ded9dc8796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_installments_quote" ON "quote_installments" ("quote_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "client_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "code" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'draft', "quote_date" date NOT NULL, "valid_until" date NOT NULL, "unit_price" numeric(15,2) NOT NULL, "discount" numeric(15,2) NOT NULL DEFAULT '0', "total_value" numeric(15,2) NOT NULL, "reservation_amount" numeric(15,2) NOT NULL DEFAULT '0', "down_payment_percent" numeric(5,2) NOT NULL, "down_payment_value" numeric(15,2) NOT NULL, "installments_count" integer NOT NULL, "installment_amount" numeric(15,2) NOT NULL, "first_installment_date" date NOT NULL, "balance_value" numeric(15,2) NOT NULL, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_quotes_project_code" ON "quotes" ("project_id", "code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_installments" ADD CONSTRAINT "FK_a31744db22d4f94dd9dc4d2972f" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_48f2dd2ff22c259c8a028267f76" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_399aa50cecd52a8d896c3d7ca21" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_c7436620804208a7496ad03aff9" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_1321c89683eb03db0ef4e8f733a" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_1321c89683eb03db0ef4e8f733a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_c7436620804208a7496ad03aff9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_399aa50cecd52a8d896c3d7ca21"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_48f2dd2ff22c259c8a028267f76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_installments" DROP CONSTRAINT "FK_a31744db22d4f94dd9dc4d2972f"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_quotes_project_code"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quote_installments_quote"`);
    await queryRunner.query(`DROP TABLE "quote_installments"`);
  }
}
