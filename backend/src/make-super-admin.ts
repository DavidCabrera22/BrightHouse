/**
 * Script to assign SuperAdmin role to a user by email.
 * Usage: npx ts-node src/make-super-admin.ts <email>
 * Example: npx ts-node src/make-super-admin.ts david@example.com
 */
import { Client } from 'pg';
import { config } from 'dotenv';

config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx ts-node src/make-super-admin.ts <email>');
  process.exit(1);
}

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

  // Ensure SuperAdmin role exists
  const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'SuperAdmin'`);
  let roleId: string;
  if (roleRes.rows.length === 0) {
    const insert = await client.query(
      `INSERT INTO roles (id, name, permissions) VALUES (gen_random_uuid(), 'SuperAdmin', '{}') RETURNING id`,
    );
    roleId = insert.rows[0].id;
    console.log('✅ SuperAdmin role created');
  } else {
    roleId = roleRes.rows[0].id;
  }

  // Find user
  const userRes = await client.query(`SELECT id, name FROM users WHERE email = $1`, [email]);
  if (userRes.rows.length === 0) {
    console.error(`❌ No user found with email: ${email}`);
    await client.end();
    process.exit(1);
  }

  const user = userRes.rows[0];
  await client.query(
    `UPDATE users SET role_id = $1, tenant_id = NULL WHERE id = $2`,
    [roleId, user.id],
  );

  console.log(`✅ "${user.name}" (${email}) ahora es SuperAdmin`);
  await client.end();
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
