import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhapiService } from './whapi.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { NovaModule } from '../nova/nova.module';

@Module({
  imports: [ConversationsModule, NovaModule],
  controllers: [WhatsAppController],
  providers: [WhapiService],
})
export class WebhooksModule {}
