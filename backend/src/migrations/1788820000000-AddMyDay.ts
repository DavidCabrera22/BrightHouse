import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMyDay1788820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "day_tasks" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "lead_id" uuid REFERENCES "leads"("id") ON DELETE CASCADE,
      "source_key" character varying,
      "kind" character varying NOT NULL,
      "title" character varying(160) NOT NULL,
      "due_at" timestamptz NOT NULL,
      "completed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_day_task_source" ON "day_tasks" ("owner_id", "source_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_day_task_owner_due" ON "day_tasks" ("owner_id", "due_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_day_activity" ON "messages" ("conversation_id", "created_at" DESC) WHERE "sender_type" IN ('user', 'agent', 'bot')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_messages_day_activity"`);
    await queryRunner.query(`DROP TABLE "day_tasks"`);
  }
}
