import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhapiService } from './whapi.service';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { NovaModule } from '../nova/nova.module';
import { LeadsModule } from '../leads/leads.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [ConversationsModule, NovaModule, LeadsModule, TenantsModule],
  controllers: [WhatsAppController, InstagramController],
  providers: [WhapiService, InstagramService],
})
export class WebhooksModule {}
