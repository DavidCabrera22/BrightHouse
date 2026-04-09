/**
 * Script to assign SuperAdmin role to a user by email.
 * Usage: npx ts-node src/make-super-admin.ts <email>
 * Example: npx ts-node src/make-super-admin.ts david@example.com
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';

config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx ts-node src/make-super-admin.ts <email>');
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [Role, User],
  synchronize: false,
});

async function run() {
  await dataSource.initialize();

  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  // Ensure SuperAdmin role exists
  let superAdminRole = await roleRepo.findOneBy({ name: 'SuperAdmin' });
  if (!superAdminRole) {
    superAdminRole = await roleRepo.save(
      roleRepo.create({ name: 'SuperAdmin', description: 'Platform Super Administrator — sees all tenants' }),
    );
    console.log('✅ SuperAdmin role created');
  }

  // Find user by email
  const user = await userRepo.findOneBy({ email });
  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  // Assign role
  user.role_id = superAdminRole.id;
  user.tenant_id = null; // SuperAdmin has no tenant — sees everything
  await userRepo.save(user);

  console.log(`✅ User "${user.name}" (${email}) is now SuperAdmin`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
