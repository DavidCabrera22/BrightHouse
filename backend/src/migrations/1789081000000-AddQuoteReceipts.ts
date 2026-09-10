import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuoteReceipts1789081000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "quote_receipts" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "quote_id" uuid NOT NULL REFERENCES "quotes"("id") ON DELETE RESTRICT,
      "storage_public_id" character varying NOT NULL,
      "original_name" character varying(255) NOT NULL,
      "mime_type" character varying(100) NOT NULL,
      "file_size" integer NOT NULL,
      "installment_snapshot" jsonb,
      "notes" text,
      "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_quote_receipts_quote" ON "quote_receipts" ("quote_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quote_receipts"`);
  }
}
