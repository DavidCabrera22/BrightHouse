/**
 * Assigns a tenant to the rows created before multi-tenancy existed.
 *
 * Tenant isolation now fails closed: a non-SuperAdmin account whose
 * `tenant_id` is NULL is rejected on every request. Anything seeded before the
 * `tenants` table was introduced has a NULL tenant_id, so run this once before
 * deploying the isolation change or those accounts lose access.
 *
 * Dry run (prints what it would do, changes nothing):
 *   npm run backfill:tenants
 *
 * Apply:
 *   npm run backfill:tenants -- --apply
 *
 * Optional: target a specific tenant instead of the default one
 *   npm run backfill:tenants -- --apply --slug=oasis --name="Oasis Park"
 */
import { Client } from 'pg';
import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const slug = (args.find((a) => a.startsWith('--slug=')) ?? '--slug=brighthouse').split('=')[1];
const name =
  (args.find((a) => a.startsWith('--name=')) ?? '--name=BrightHouse').split('=').slice(1).join('=');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log(apply ? '⚙️  APPLY mode — changes will be written\n' : '🔍 DRY RUN — nothing will be written\n');

  // ── 1. Resolve (or create) the target tenant ───────────────────────────────
  let tenantId: string;
  const existing = await client.query('SELECT id, name FROM tenants WHERE slug = $1', [slug]);

  if (existing.rows.length > 0) {
    tenantId = existing.rows[0].id;
    console.log(`✓ Tenant "${existing.rows[0].name}" (${slug}) already exists → ${tenantId}`);
  } else if (apply) {
    const created = await client.query(
      `INSERT INTO tenants (id, name, slug, plan, status)
       VALUES (gen_random_uuid(), $1, $2, 'basic', 'active') RETURNING id`,
      [name, slug],
    );
    tenantId = created.rows[0].id;
    console.log(`✓ Tenant "${name}" (${slug}) created → ${tenantId}`);
  } else {
    tenantId = '<new-tenant-id>';
    console.log(`• Would create tenant "${name}" (${slug})`);
  }

  // ── 2. Backfill each table that carries tenant_id ──────────────────────────
  // Projects first: every other tenant-owned table reaches its tenant through
  // a project, so once projects are assigned the rest follow automatically.
  const targets: { table: string; label: string; extraWhere: string }[] = [
    { table: 'projects', label: 'projects', extraWhere: '' },
    {
      table: 'users',
      label: 'users (SuperAdmins deliberately left global)',
      extraWhere: `AND role_id NOT IN (SELECT id FROM roles WHERE name = 'SuperAdmin')`,
    },
    { table: 'conversations', label: 'conversations', extraWhere: '' },
  ];

  for (const { table, label, extraWhere } of targets) {
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM ${table} WHERE tenant_id IS NULL ${extraWhere}`,
    );
    const n = countRes.rows[0].n;

    if (n === 0) {
      console.log(`✓ ${label}: nothing to backfill`);
      continue;
    }

    if (apply) {
      await client.query(
        `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL ${extraWhere}`,
        [tenantId],
      );
      console.log(`✓ ${label}: ${n} row(s) assigned to ${slug}`);
    } else {
      console.log(`• ${label}: ${n} row(s) would be assigned to ${slug}`);
    }
  }

  // ── 3. Flag accounts that would still be locked out ────────────────────────
  const stranded = await client.query(
    `SELECT u.email, COALESCE(r.name, '(no role)') AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.tenant_id IS NULL
        AND COALESCE(r.name, '') <> 'SuperAdmin'`,
  );

  if (stranded.rows.length > 0) {
    console.log('\n⚠️  These accounts still have no tenant and will be denied access:');
    for (const row of stranded.rows) console.log(`   - ${row.email} (${row.role})`);
  } else {
    console.log('\n✓ No account is left without a tenant.');
  }

  if (!apply) console.log('\nRe-run with --apply to write these changes.');

  await client.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
