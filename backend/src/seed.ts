import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { UnitStatus } from './unit-statuses/entities/unit-status.entity';
import * as bcrypt from 'bcrypt';

config(); // Load .env

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    Role,
    User,
    UnitStatus,
  ],
  synchronize: false, // Don't sync schema in seed, assume it's there
});

async function seed() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('Connected!');

    // 1. Roles
    console.log('Seeding Roles...');
    const roleRepo = dataSource.getRepository(Role);
    const rolesData = [
      { name: 'SuperAdmin', description: 'Platform Super Administrator — sees all tenants' },
      { name: 'Admin', description: 'Tenant Administrator' },
      { name: 'Agent', description: 'Sales Agent' },
      { name: 'User', description: 'Regular User' },
    ];
    
    const savedRoles: Record<string, Role> = {};
    for (const roleData of rolesData) {
      let role = await roleRepo.findOneBy({ name: roleData.name });
      if (!role) {
        role = roleRepo.create(roleData);
        await roleRepo.save(role);
      }
      savedRoles[roleData.name] = role;
    }

    // 2. Users
    console.log('Seeding Users...');
    const userRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usersData = [
      {
        email: 'admin@brighthouse.com',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: savedRoles['Admin'],
        status: 'active',
      },
      {
        email: 'agent1@brighthouse.com',
        password_hash: passwordHash,
        name: 'John Agent',
        role: savedRoles['Agent'],
        status: 'active',
      },
      {
        email: 'agent2@brighthouse.com',
        password_hash: passwordHash,
        name: 'Sarah Seller',
        role: savedRoles['Agent'],
        status: 'active',
      },
    ];

    const savedUsers: Record<string, User> = {};
    for (const userData of usersData) {
      let user = await userRepo.findOneBy({ email: userData.email });
      if (!user) {
        user = userRepo.create(userData);
        await userRepo.save(user);
      }
      savedUsers[userData.email] = user;
    }

    // 3. Unit Statuses
    console.log('Seeding Unit Statuses...');
    const statusRepo = dataSource.getRepository(UnitStatus);
    const statusesData = [
      { name: 'Available', color_hex: '#28a745', triggers_commission: false, triggers_signature: false },
      { name: 'Reserved', color_hex: '#ffc107', triggers_commission: true, triggers_signature: true },
      { name: 'Sold', color_hex: '#dc3545', triggers_commission: true, triggers_signature: true },
    ];

    for (const statusData of statusesData) {
      let status = await statusRepo.findOneBy({ name: statusData.name });
      if (!status) {
        status = statusRepo.create(statusData);
        await statusRepo.save(status);
      }
    }

    console.log('Seeding Complete! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
