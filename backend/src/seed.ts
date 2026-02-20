import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { UnitStatus } from './unit-statuses/entities/unit-status.entity';
import { Unit } from './units/entities/unit.entity';
import { Client } from './clients/entities/client.entity';
import { Lead } from './leads/entities/lead.entity';
import { Campaign } from './campaigns/entities/campaign.entity';
import { Sale } from './sales/entities/sale.entity';
import { Document } from './documents/entities/document.entity';
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
    Project,
    UnitStatus,
    Unit,
    Client,
    Lead,
    Campaign,
    Sale,
    Document,
    // Add other entities if needed for the seed
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
      { name: 'Admin', description: 'System Administrator' },
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

    // 3. Projects
    console.log('Seeding Projects...');
    const projectRepo = dataSource.getRepository(Project);
    const projectData = {
      name: 'Sunrise Apartments',
      description: 'Luxury apartments with ocean view',
      location: 'Miami Beach, FL',
      total_units: 50,
      status: 'Active',
    };
    
    let project = await projectRepo.findOneBy({ name: projectData.name });
    if (!project) {
      project = projectRepo.create(projectData);
      await projectRepo.save(project);
    }

    // 4. Unit Statuses
    console.log('Seeding Unit Statuses...');
    const statusRepo = dataSource.getRepository(UnitStatus);
    const statusesData = [
      { name: 'Available', color_hex: '#28a745', triggers_commission: false, triggers_signature: false },
      { name: 'Reserved', color_hex: '#ffc107', triggers_commission: true, triggers_signature: true },
      { name: 'Sold', color_hex: '#dc3545', triggers_commission: true, triggers_signature: true },
    ];

    const savedStatuses: Record<string, UnitStatus> = {};
    for (const statusData of statusesData) {
      let status = await statusRepo.findOneBy({ name: statusData.name });
      if (!status) {
        status = statusRepo.create(statusData);
        await statusRepo.save(status);
      }
      savedStatuses[statusData.name] = status;
    }

    // 5. Units
    console.log('Seeding Units...');
    const unitRepo = dataSource.getRepository(Unit);
    const unitsData = [
      { code: '101', floor: '1', tower: 'A', price: 250000, area: 1200, current_status: savedStatuses['Available'], project: project },
      { code: '102', floor: '1', tower: 'A', price: 255000, area: 1200, current_status: savedStatuses['Reserved'], project: project },
      { code: '201', floor: '2', tower: 'A', price: 350000, area: 1500, current_status: savedStatuses['Available'], project: project },
      { code: 'PH1', floor: '10', tower: 'A', price: 950000, area: 2500, current_status: savedStatuses['Available'], project: project },
    ];

    const savedUnits: Record<string, Unit> = {};
    for (const unitData of unitsData) {
      let unit = await unitRepo.findOneBy({ code: unitData.code, project: { id: project.id } });
      if (!unit) {
        unit = unitRepo.create(unitData);
        await unitRepo.save(unit);
      }
      savedUnits[unitData.code] = unit;
    }

    // 6. Clients
    console.log('Seeding Clients...');
    const clientRepo = dataSource.getRepository(Client);
    const clientsData = [
      { name: 'Alice Buyer', document_number: 'DOC123456', email: 'alice@example.com', phone: '555-0101', project: project },
      { name: 'Bob Investor', document_number: 'DOC789012', email: 'bob@example.com', phone: '555-0102', project: project },
    ];

    const savedClients: Record<string, Client> = {};
    for (const clientData of clientsData) {
      let client = await clientRepo.findOneBy({ email: clientData.email });
      if (!client) {
        client = clientRepo.create(clientData);
        await clientRepo.save(client);
      }
      savedClients[clientData.name.split(' ')[0]] = client; // Store by first name for reference
    }

    // 7. Campaigns
    console.log('Seeding Campaigns...');
    const campaignRepo = dataSource.getRepository(Campaign);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    
    const campaignData = {
      name: 'Summer Sale 2026',
      start_date: new Date(),
      end_date: endDate,
      budget: 5000,
      project: project,
    };
    
    let campaign = await campaignRepo.findOneBy({ name: campaignData.name });
    if (!campaign) {
      campaign = campaignRepo.create(campaignData);
      await campaignRepo.save(campaign);
    }

    // 8. Leads
    console.log('Seeding Leads...');
    const leadRepo = dataSource.getRepository(Lead);
    const leadData = {
      name: 'Charlie Prospect',
      email: 'charlie@example.com',
      phone: '555-0103',
      source: 'Instagram',
      status: 'New',
      project: project,
      assigned_agent: savedUsers['agent1@brighthouse.com'],
    };

    let lead = await leadRepo.findOneBy({ email: leadData.email });
    if (!lead) {
      lead = leadRepo.create(leadData);
      await leadRepo.save(lead);
    }

    // 9. Sales (for Unit 102 - Reserved)
    console.log('Seeding Sales...');
    const saleRepo = dataSource.getRepository(Sale);
    const unit102 = savedUnits['102'];
    const clientAlice = savedClients['Alice'];
    const agentJohn = savedUsers['agent1@brighthouse.com'];

    let sale = await saleRepo.findOneBy({ unit: { id: unit102.id } });
    if (!sale && unit102 && clientAlice && agentJohn) {
      sale = saleRepo.create({
        unit: unit102,
        client: clientAlice,
        agent: agentJohn,
        sale_value: unit102.price,
        sale_date: new Date(),
        status: 'Pending',
      });
      await saleRepo.save(sale);
    }

    console.log('Seeding Complete! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
