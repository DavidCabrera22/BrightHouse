import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhapiService } from './whapi.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { NovaModule } from '../nova/nova.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [ConversationsModule, NovaModule, LeadsModule],
  controllers: [WhatsAppController],
  providers: [WhapiService],
})
export class WebhooksModule {}
