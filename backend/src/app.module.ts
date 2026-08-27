import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { UnitsModule } from './units/units.module';
import { UnitStatusesModule } from './unit-statuses/unit-statuses.module';
import { UnitStatusHistoryModule } from './unit-status-history/unit-status-history.module';
import { ClientsModule } from './clients/clients.module';
import { SalesModule } from './sales/sales.module';
import { QuotesModule } from './quotes/quotes.module';
import { CommissionsModule } from './commissions/commissions.module';
import { DocumentsModule } from './documents/documents.module';
import { DigitalSignaturesModule } from './digital-signatures/digital-signatures.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ConversationsModule } from './conversations/conversations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantModule } from './common/tenant/tenant.module';
import { AutomationsModule } from './automations/automations.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TenantModule,
    // Decouples lead events from the automations that react to them.
    EventEmitterModule.forRoot(),
    // Drives the hourly sweep for idle leads.
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        // Off unless explicitly enabled. synchronize alters the live schema on
        // every boot and will drop a column the moment an entity drifts, so
        // production evolves through migrations instead.
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        migrationsRun: configService.get<string>('DB_MIGRATIONS_RUN') === 'true',
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    UnitsModule,
    UnitStatusesModule,
    UnitStatusHistoryModule,
    ClientsModule,
    SalesModule,
    QuotesModule,
    CommissionsModule,
    DocumentsModule,
    DigitalSignaturesModule,
    LeadsModule,
    CampaignsModule,
    AuditLogsModule,
    ConversationsModule,
    WebhooksModule,
    AnalyticsModule,
    CloudinaryModule,
    TenantsModule,
    AutomationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
