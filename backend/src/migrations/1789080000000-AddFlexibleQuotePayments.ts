import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlexibleQuotePayments1789080000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes"
      ADD COLUMN "payment_plan" character varying NOT NULL DEFAULT 'fixed',
      ADD COLUMN "balance_due_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes"
      DROP COLUMN "balance_due_date", DROP COLUMN "payment_plan"`);
  }
}
