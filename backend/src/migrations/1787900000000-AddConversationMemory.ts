import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationMemory1787900000000 implements MigrationInterface {
  name = 'AddConversationMemory1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "memory_summary" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "memory_summary_until" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "memory_summary_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "memory_summary"`,
    );
  }
}
