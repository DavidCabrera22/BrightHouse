/**
 * DataSource used by the TypeORM CLI for migrations.
 *
 * The running app builds its own config in `app.module.ts`; this file only
 * needs to point at the same database and entities so `migration:generate`
 * can diff the entities against the live schema.
 *
 *   npm run migration:generate -- src/migrations/DescribeTheChange
 *   npm run migration:run
 *   npm run migration:revert
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Never true here: the CLI must describe schema changes, not apply them silently.
  synchronize: false,
});
