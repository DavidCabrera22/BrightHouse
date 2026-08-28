/**
 * Le da a un tenant su propio proyecto y repatría los leads que se le fueron a
 * la cartera de otro edificio.
 *
 * Un tenant sin `default_project_id` hacía que el webhook cayera al
 * `DEFAULT_PROJECT_ID` del entorno, que apunta a Oasis Park: los prospectos que
 * escribían al WhatsApp de Alpes Vista quedaban registrados como leads de Oasis
 * Park. El código ya no hace eso, pero las filas que se escribieron mientras
 * tanto siguen mal, y el tenant sigue sin proyecto.
 *
 * Dry run (imprime lo que haría, no escribe nada):
 *   npm run fix:tenant-project
 *
 * Aplicar:
 *   npm run fix:tenant-project -- --apply
 *
 * Otro tenant:
 *   npm run fix:tenant-project -- --apply --slug=otro --project="Otro" --location="Ciudad"
 */
import { Client } from 'pg';
import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const arg = (name: string, fallback: string) =>
  (args.find((a) => a.startsWith(`--${name}=`)) ?? `--${name}=${fallback}`)
    .split('=')
    .slice(1)
    .join('=');

const slug = arg('slug', 'alpes-vista');
const projectName = arg('project', 'Alpes Vista');
const projectLocation = arg('location', 'sector Los Alpes, Cartagena');

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
  console.log(
    apply
      ? '⚙️  APPLY — se van a escribir cambios\n'
      : '🔍 DRY RUN — no se escribe nada\n',
  );

  // ── 1. El tenant ───────────────────────────────────────────────────────────
  const tenantRes = await client.query(
    'SELECT id, name, default_project_id FROM tenants WHERE slug = $1',
    [slug],
  );
  if (tenantRes.rows.length === 0) {
    console.error(`✗ No existe ningún tenant con slug "${slug}". Nada que hacer.`);
    await client.end();
    process.exitCode = 1;
    return;
  }
  const tenant = tenantRes.rows[0];
  console.log(`Tenant "${tenant.name}" (${slug}) → ${tenant.id}`);

  // ── 2. Su proyecto ─────────────────────────────────────────────────────────
  const projectRes = await client.query(
    'SELECT id, name FROM projects WHERE tenant_id = $1 ORDER BY created_at LIMIT 1',
    [tenant.id],
  );

  let projectId: string;
  if (projectRes.rows.length > 0) {
    projectId = projectRes.rows[0].id;
    console.log(`✓ Ya tiene proyecto: "${projectRes.rows[0].name}" → ${projectId}`);
  } else if (apply) {
    // El slug es único en toda la tabla: si ya está tomado, se deja en NULL
    // antes que hacer fallar la inserción entera.
    const slugTaken = await client.query('SELECT 1 FROM projects WHERE slug = $1', [slug]);
    const created = await client.query(
      `INSERT INTO projects (id, name, location, total_units, status, slug, tenant_id)
       VALUES (gen_random_uuid(), $1, $2, 0, 'active', $3, $4)
       RETURNING id`,
      [projectName, projectLocation, slugTaken.rows.length > 0 ? null : slug, tenant.id],
    );
    projectId = created.rows[0].id;
    console.log(`✓ Proyecto "${projectName}" creado → ${projectId}`);
  } else {
    projectId = '<nuevo-proyecto>';
    console.log(`• Crearía el proyecto "${projectName}" (${projectLocation}) en este tenant`);
  }

  // ── 3. default_project_id ──────────────────────────────────────────────────
  const defaultOk =
    tenant.default_project_id &&
    (
      await client.query('SELECT 1 FROM projects WHERE id = $1 AND tenant_id = $2', [
        tenant.default_project_id,
        tenant.id,
      ])
    ).rows.length > 0;

  if (defaultOk) {
    console.log('✓ default_project_id ya apunta a un proyecto propio');
  } else if (apply) {
    await client.query('UPDATE tenants SET default_project_id = $1 WHERE id = $2', [
      projectId,
      tenant.id,
    ]);
    console.log(`✓ default_project_id → ${projectId}`);
  } else {
    console.log(
      `• Pondría default_project_id = ${projectId}` +
        (tenant.default_project_id ? ` (hoy: ${tenant.default_project_id}, de otro tenant)` : ' (hoy: NULL)'),
    );
  }

  // ── 4. Leads que entraron por este tenant y acabaron en otra cartera ────────
  const strayRes = await client.query(
    `SELECT l.id, l.name, l.phone, p.name AS proyecto_actual
       FROM leads l
       JOIN conversations c ON c.lead_id = l.id
       LEFT JOIN projects p ON p.id = l.project_id
      WHERE c.tenant_id = $1::text
        AND l.project_id NOT IN (SELECT id FROM projects WHERE tenant_id = $2)`,
    [tenant.id, tenant.id],
  );

  if (strayRes.rows.length === 0) {
    console.log('✓ Ningún lead de este tenant está en un proyecto ajeno');
  } else {
    console.log(`\n${strayRes.rows.length} lead(s) en un proyecto de otro tenant:`);
    for (const lead of strayRes.rows) {
      console.log(`  · ${lead.name} (${lead.phone}) — hoy en "${lead.proyecto_actual}"`);
    }
    if (apply) {
      const ids = strayRes.rows.map((r) => r.id);
      await client.query('UPDATE leads SET project_id = $1 WHERE id = ANY($2::uuid[])', [
        projectId,
        ids,
      ]);
      console.log(`✓ Movidos a "${projectName}"`);
    } else {
      console.log(`• Los movería a "${projectName}" (${projectId})`);
    }
  }

  await client.end();
  console.log(
    apply ? '\nListo.' : '\nDry run terminado. Repite con --apply para escribir.',
  );
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
