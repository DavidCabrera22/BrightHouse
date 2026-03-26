/**
 * Seed — Oasis Park via API REST
 * Run: npm run seed:oasis
 *
 * Requiere que el backend esté corriendo en http://localhost:3000
 * y las credenciales admin en ADMIN_EMAIL / ADMIN_PASSWORD (o valores por defecto).
 *
 * Es idempotente: si el proyecto ya existe, omite la creación.
 */

import * as http from 'http';
import * as https from 'https';
import { config } from 'dotenv';

config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@brighthouse.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'password123';

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function request(
  method: string,
  path: string,
  body?: object,
  token?: string,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const payload = body ? JSON.stringify(body) : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload).toString();

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode!, data: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode!, data: raw }); }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Inventario disponible ────────────────────────────────────────────────────
// [piso, código]  — terminados en 1 o 3 → Tipo A (60m²) | resto → Tipo B (65m²)
const UNITS: [number, string][] = [
  [17, '1701'],
  [16, '1602'],
  [15, '1503'], [15, '1504'],
  [14, '1404'],
  [13, '1301'], [13, '1303'],
  [12, '1202'], [12, '1203'],
  [11, '1101'], [11, '1103'], [11, '1104'],
  [10, '1004'],
  [6,  '602'],  [6,  '603'],
  [5,  '502'],  [5,  '503'],  [5,  '504'],
  [4,  '402'],  [4,  '403'],  [4,  '404'],  [4, '407'],
  [3,  '302'],  [3,  '303'],  [3,  '304'],  [3, '308'],
  [2,  '202'],  [2,  '203'],  [2,  '204'],  [2, '206'],
  [1,  '102'],  [1,  '103'],  [1,  '104'],
];

function tipologia(code: string) {
  const last = code.slice(-1);
  return (last === '1' || last === '3')
    ? { area: 60, tipo: 'A' }
    : { area: 65, tipo: 'B' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Seed Oasis Park — via API REST');
  console.log(`📡  Backend: ${BASE_URL}\n`);

  // ── 1. Login ────────────────────────────────────────────────────────────────
  console.log('🔐  Autenticando como admin...');
  const loginRes = await request('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('❌  Login fallido:', loginRes.data);
    console.error('    Verifica SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env');
    process.exit(1);
  }

  const token: string = loginRes.data.access_token;
  console.log('   ✅  Token obtenido\n');

  // ── 2. Unit Statuses ────────────────────────────────────────────────────────
  console.log('📋  Verificando estados de unidad...');
  const statusesRes = await request('GET', '/unit-statuses', undefined, token);
  const existingStatuses: any[] = statusesRes.data || [];

  const statusDefs = [
    { name: 'Disponible', color_hex: '#22c55e', triggers_commission: false, triggers_signature: false, order_sequence: 1 },
    { name: 'Separado',   color_hex: '#3b82f6', triggers_commission: false, triggers_signature: false, order_sequence: 2 },
    { name: 'En Proceso', color_hex: '#f59e0b', triggers_commission: false, triggers_signature: false, order_sequence: 3 },
    { name: 'Vendido',    color_hex: '#ef4444', triggers_commission: true,  triggers_signature: true,  order_sequence: 4 },
  ];

  const spanishNames = new Set(statusDefs.map(d => d.name));
  const statusMap: Record<string, string> = {};

  for (const def of statusDefs) {
    const found = existingStatuses.find((s: any) => s.name === def.name);
    if (found) {
      statusMap[def.name] = found.id;
      console.log(`   ↩  Existente: ${def.name} (${found.id})`);
    } else {
      const res = await request('POST', '/unit-statuses', def, token);
      if (res.status === 200 || res.status === 201) {
        statusMap[def.name] = res.data.id;
        console.log(`   ✚  Creado: ${def.name} (${res.data.id})`);
      } else {
        console.error(`   ❌  Error creando estado ${def.name}:`, res.data);
      }
    }
  }

  const disponibleId = statusMap['Disponible'];
  if (!disponibleId) {
    console.error('❌  No se pudo obtener el estado "Disponible". Abortando.');
    process.exit(1);
  }

  // ── 2b. Limpiar estados en inglés (legacy) ──────────────────────────────────
  const legacyStatuses = existingStatuses.filter((s: any) => !spanishNames.has(s.name));
  if (legacyStatuses.length > 0) {
    console.log(`\n🧹  Limpiando ${legacyStatuses.length} estado(s) legado(s) en inglés...`);

    // Mapeo inglés → español (para migrar unidades)
    const englishToSpanish: Record<string, string> = {
      'available':   'Disponible', 'Available':   'Disponible',
      'reserved':    'Separado',   'Reserved':    'Separado',
      'in process':  'En Proceso', 'In Process':  'En Proceso', 'In Progress': 'En Proceso',
      'sold':        'Vendido',    'Sold':        'Vendido',
    };

    for (const legacy of legacyStatuses) {
      const spanishName = englishToSpanish[legacy.name] ?? 'Disponible';
      const targetId = statusMap[spanishName];

      if (!targetId) continue;

      // Migrar unidades que usen este estado legado
      const unitsRes = await request('GET', `/units?status_id=${legacy.id}`, undefined, token);
      // La ruta GET /units no filtra por status_id, así que buscamos todas y filtramos
      const allUnitsRes = await request('GET', '/units', undefined, token);
      const unitsToMigrate = (allUnitsRes.data || []).filter(
        (u: any) => u.current_status_id === legacy.id,
      );

      for (const u of unitsToMigrate) {
        await request('PATCH', `/units/${u.id}/status`, { new_status_id: targetId }, token);
        console.log(`   🔄  Unidad ${u.code}: ${legacy.name} → ${spanishName}`);
      }

      // Eliminar el estado legado
      const delRes = await request('DELETE', `/unit-statuses/${legacy.id}`, undefined, token);
      if (delRes.status === 200 || delRes.status === 204) {
        console.log(`   🗑   Estado eliminado: "${legacy.name}"`);
      } else {
        console.warn(`   ⚠️  No se pudo eliminar "${legacy.name}":`, delRes.data);
      }
    }
  }

  // ── 3. Proyecto ─────────────────────────────────────────────────────────────
  console.log('\n🏢  Verificando proyecto Oasis Park...');
  const projectsRes = await request('GET', '/projects', undefined, token);
  const existingProjects: any[] = projectsRes.data || [];
  let projectId: string;

  const found = existingProjects.find((p: any) => p.name === 'Oasis Park');
  if (found) {
    projectId = found.id;
    console.log(`   ↩  Proyecto ya existe: Oasis Park (${projectId})`);
    const patch: Record<string, string> = {};
    if (!found.slug) patch.slug = 'oasis-park';
    if (!found.image) patch.image = '/uploads/oasis-park.jpg';
    if (Object.keys(patch).length > 0) {
      await request('PATCH', `/projects/${projectId}`, patch, token);
      console.log('   ✎  Campos actualizados:', Object.keys(patch).join(', '));
    }
  } else {
    const res = await request('POST', '/projects', {
      name: 'Oasis Park',
      description:
        'Proyecto residencial VIS de 17 pisos con 127 apartamentos. ' +
        'Tipologías 2 alcobas + estudio (60-65 m²). ' +
        'Amenidades: piscina, gimnasio, coworking, BBQ, spa, sport center y más. ' +
        'Constructores: CIN Constructores & MR Constructores. Fiducia: Alianza Fiduciaria.',
      location: 'Barrio Providencia, Cartagena de Indias — Diagonal 32A #71-355',
      total_units: 127,
      status: 'active',
      slug: 'oasis-park',
      image: '/uploads/oasis-park.jpg',
      marketing_plan_type: 'figital',
    }, token);

    if (res.status === 200 || res.status === 201) {
      projectId = res.data.id;
      console.log(`   ✚  Proyecto creado: Oasis Park (${projectId})`);
    } else {
      console.error('❌  Error creando proyecto:', res.data);
      process.exit(1);
    }
  }

  // ── 4. Unidades ─────────────────────────────────────────────────────────────
  console.log('\n🏠  Insertando unidades disponibles...');

  // Obtener unidades existentes del proyecto
  const existingUnitsRes = await request('GET', `/units?project_id=${projectId}`, undefined, token);
  const existingCodes = new Set(
    (existingUnitsRes.data || []).map((u: any) => u.code),
  );

  let created = 0;
  let skipped = 0;

  for (const [floor, code] of UNITS) {
    if (existingCodes.has(code)) {
      skipped++;
      continue;
    }

    const { area, tipo } = tipologia(code);
    const res = await request('POST', '/units', {
      project_id: projectId,
      code,
      tower: 'Torre Única',
      floor: String(floor),
      area,
      price: 238_000_000,
      current_status_id: disponibleId,
    }, token);

    if (res.status === 200 || res.status === 201) {
      console.log(`   ✚  ${code} — Piso ${floor} — Tipo ${tipo} (${area}m²)`);
      created++;
    } else {
      console.error(`   ❌  Error creando unidad ${code}:`, res.data);
    }
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  console.log(`\n📊  Resumen:`);
  console.log(`   Unidades creadas : ${created}`);
  console.log(`   Unidades omitidas: ${skipped}`);
  console.log(`   Total disponibles: ${UNITS.length}`);
  console.log('\n✅  Seed Oasis Park completado!\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Error inesperado:', err.message);
  process.exit(1);
});
