/**
 * Da de alta Eleganzza como empresa propia, operada solo por Sofía (y el
 * SuperAdmin, que ve todo).
 *
 * - Crea el tenant `eleganzza` y le mueve el proyecto "Eleganzza", que estaba
 *   en el tenant `brighthouse` (y por eso lo veían John Agent y Sarah Seller).
 * - Carga las 12 unidades de la lista de precios de julio de 2026.
 * - Le da a Sofía acceso a Eleganzza sin quitarle Alpes Vista (user_tenants).
 *
 * Requiere la migración AddUserTenants: `npm run migration:run` antes.
 * Es idempotente: lo que ya existe se deja como está.
 *
 * Dry run (imprime lo que haría, no escribe nada):
 *   npm run setup:eleganzza
 *
 * Aplicar:
 *   npm run setup:eleganzza -- --apply
 */
import { Client } from 'pg';
import { config } from 'dotenv';

config();

const apply = process.argv.slice(2).includes('--apply');

const TENANT_SLUG = 'eleganzza';
const TENANT_NAME = 'Eleganzza';
const PROJECT_NAME = 'Eleganzza';
const AGENT_EMAIL = 'sofiacabreracaro@gmail.com';

/**
 * Lista de precios julio 2026. `price` es lo que paga el cliente: precio con
 * parqueadero, más la terraza en los tres apartamentos que la tienen
 * (el sistema no tiene campo de terraza; su área va en `unit_type`).
 */
const UNITS: { code: string; area: number; price: number; status: 'Disponible' | 'Separado'; terrace?: string }[] = [
  { code: '202', area: 54.8, price: 658_855_000, status: 'Disponible', terrace: '53,11' },
  { code: '203', area: 54.8, price: 601_780_000, status: 'Disponible', terrace: '30,28' },
  { code: '205', area: 52.0, price: 499_200_000, status: 'Disponible' },
  { code: '206', area: 54.4, price: 522_240_000, status: 'Disponible' },
  { code: '208', area: 52.0, price: 577_550_000, status: 'Disponible', terrace: '31,34' },
  { code: '302', area: 54.8, price: 526_580_000, status: 'Disponible' },
  { code: '303', area: 54.8, price: 526_580_000, status: 'Disponible' },
  { code: '305', area: 52.0, price: 499_700_000, status: 'Disponible' },
  { code: '306', area: 54.4, price: 522_740_000, status: 'Separado' },
  { code: '307', area: 54.4, price: 522_740_000, status: 'Disponible' },
  { code: '402', area: 54.8, price: 527_080_000, status: 'Disponible' },
  { code: '403', area: 54.8, price: 527_080_000, status: 'Separado' },
];

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
  console.log(apply ? '⚙️  APPLY — se van a escribir cambios\n' : '🔍 DRY RUN — no se escribe nada\n');

  // ── 0. Precondiciones ──────────────────────────────────────────────────────
  const table = await client.query(`SELECT to_regclass('public.user_tenants') AS t`);
  const hasMemberships = !!table.rows[0].t;
  if (!hasMemberships && apply) {
    console.error('✗ Falta la tabla user_tenants. Corre `npm run migration:run` primero.');
    await client.end();
    process.exitCode = 1;
    return;
  }

  const projectRes = await client.query(
    `SELECT p.id, p.tenant_id, p.slug, t.slug AS tenant_slug
       FROM projects p LEFT JOIN tenants t ON t.id::text = p.tenant_id
      WHERE p.name = $1`,
    [PROJECT_NAME],
  );
  if (projectRes.rows.length !== 1) {
    console.error(`✗ Se esperaba exactamente un proyecto "${PROJECT_NAME}" y hay ${projectRes.rows.length}.`);
    await client.end();
    process.exitCode = 1;
    return;
  }
  const project = projectRes.rows[0];
  console.log(`Proyecto "${PROJECT_NAME}" → ${project.id} (hoy en tenant "${project.tenant_slug ?? 'ninguno'}")`);

  const agentRes = await client.query('SELECT id, name, tenant_id FROM users WHERE email = $1', [AGENT_EMAIL]);
  if (agentRes.rows.length === 0) {
    console.error(`✗ No existe el usuario ${AGENT_EMAIL}.`);
    await client.end();
    process.exitCode = 1;
    return;
  }
  const agent = agentRes.rows[0];
  console.log(`Asesora ${agent.name} → ${agent.id}\n`);

  const statuses = await client.query(`SELECT id, name FROM unit_statuses WHERE name IN ('Disponible', 'Separado')`);
  const statusId = (name: string) => statuses.rows.find((s) => s.name === name)?.id;

  /** Escrituras: en dry run no llegan a la base, ni dentro de una transacción. */
  const write = (sql: string, params: unknown[]) =>
    apply ? client.query(sql, params) : Promise.resolve({ rows: [{ id: '<nuevo-tenant>' }], rowCount: 1 });

  try {
    if (apply) await client.query('BEGIN');

    // ── 1. Tenant ────────────────────────────────────────────────────────────
    let tenantId: string;
    const tenantRes = await client.query('SELECT id FROM tenants WHERE slug = $1', [TENANT_SLUG]);
    if (tenantRes.rows.length > 0) {
      tenantId = tenantRes.rows[0].id;
      console.log(`✓ El tenant "${TENANT_SLUG}" ya existe → ${tenantId}`);
    } else {
      const created = await write(
        `INSERT INTO tenants (id, name, slug, plan, status, default_project_id, default_agent_id)
         VALUES (gen_random_uuid(), $1, $2, 'basic', 'active', $3, $4) RETURNING id`,
        [TENANT_NAME, TENANT_SLUG, project.id, agent.id],
      );
      tenantId = created.rows[0].id;
      console.log(`• Tenant "${TENANT_NAME}" (${TENANT_SLUG}) con default_project y default_agent → ${tenantId}`);
    }

    // ── 2. Proyecto al tenant nuevo ──────────────────────────────────────────
    if (project.tenant_id === tenantId) {
      console.log('✓ El proyecto ya está en el tenant');
    } else {
      const slugTaken = await client.query('SELECT 1 FROM projects WHERE slug = $1 AND id <> $2', [
        TENANT_SLUG,
        project.id,
      ]);
      await write(
        'UPDATE projects SET tenant_id = $1, slug = COALESCE(slug, $2), total_units = $3 WHERE id = $4',
        [tenantId, slugTaken.rows.length > 0 ? null : TENANT_SLUG, UNITS.length, project.id],
      );
      console.log(`• Proyecto movido de "${project.tenant_slug}" a "${TENANT_SLUG}"`);
    }

    // ── 3. Unidades ──────────────────────────────────────────────────────────
    const existing = await client.query('SELECT code FROM units WHERE project_id = $1', [project.id]);
    const existingCodes = new Set(existing.rows.map((r) => r.code));
    for (const u of UNITS) {
      if (existingCodes.has(u.code)) {
        console.log(`✓ Apto ${u.code} ya existe`);
        continue;
      }
      await write(
        `INSERT INTO units (id, project_id, code, tower, floor, area, price, current_status_id, unit_type)
         VALUES (gen_random_uuid(), $1, $2, '1', $3, $4, $5, $6, $7)`,
        [
          project.id,
          u.code,
          u.code.slice(0, -2),
          u.area,
          u.price,
          statusId(u.status),
          u.terrace ? `Terraza ${u.terrace} m²` : null,
        ],
      );
      console.log(
        `• Apto ${u.code}: ${u.area} m², $${u.price.toLocaleString('es-CO')}, ${u.status}` +
          (u.terrace ? `, terraza ${u.terrace} m²` : ''),
      );
    }

    // ── 4. Acceso de Sofía ───────────────────────────────────────────────────
    if (agent.tenant_id === tenantId) {
      console.log('✓ Eleganzza ya es el tenant principal de la asesora');
    } else if (!hasMemberships) {
      console.log(`• Le daría a ${agent.name} acceso a Eleganzza (falta la migración AddUserTenants)`);
    } else {
      const res = await write(
        `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [agent.id, tenantId],
      );
      console.log(res.rowCount ? `• ${agent.name} puede cambiar a Eleganzza` : `✓ ${agent.name} ya tenía acceso`);
    }

    if (apply) await client.query('COMMIT');
  } catch (err) {
    if (apply) await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log(apply ? '\nListo.' : '\nDry run terminado. Repite con --apply para escribir.');
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
