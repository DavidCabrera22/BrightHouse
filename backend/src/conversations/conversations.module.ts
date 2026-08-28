import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { LeadsModule } from '../leads/leads.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WhapiService } from '../webhooks/whapi.service';
import { InstagramService } from '../webhooks/instagram.service';

@Module({
  // Los servicios de envío se declaran como proveedores, no importando
  // WebhooksModule: ese módulo ya importa a este y sería una dependencia
  // circular. Es el mismo montaje que usa AutomationsModule.
  imports: [TypeOrmModule.forFeature([Conversation, Message]), LeadsModule, TenantsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, WhapiService, InstagramService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
