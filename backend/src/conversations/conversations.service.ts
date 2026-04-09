import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async createConversation(dto: CreateConversationDto): Promise<Conversation> {
    const conv = this.conversationRepo.create(dto);
    return this.conversationRepo.save(conv);
  }

  async findAllConversations(tenantId?: string): Promise<Conversation[]> {
    const where: any = tenantId ? { tenant_id: tenantId } : {};
    return this.conversationRepo.find({
      where,
      relations: ['lead', 'assigned_agent'],
      order: { last_message_at: 'DESC', created_at: 'DESC' },
    });
  }

  async findConversationById(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['lead', 'assigned_agent', 'messages'],
    });
    if (!conv) throw new NotFoundException(`Conversation ${id} not found`);
    return conv;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    await this.conversationRepo.update(id, updates);
    return this.findConversationById(id);
  }

  async findOrCreateByPhone(phone: string, channel = 'whatsapp', contactName?: string, tenantId?: string): Promise<Conversation> {
    const where: any = { contact_phone: phone, channel };
    if (tenantId) where.tenant_id = tenantId;

    let conv = await this.conversationRepo.findOne({
      where,
      order: { created_at: 'DESC' },
    });
    if (!conv) {
      conv = this.conversationRepo.create({
        contact_phone: phone,
        contact_name: contactName || phone,
        channel,
        whatsapp_waid: phone,
        status: 'open',
        tenant_id: tenantId ?? null,
      });
      conv = await this.conversationRepo.save(conv);
    }
    return conv;
  }

  async addMessage(conversationId: string, dto: CreateMessageDto): Promise<Message> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);

    const msg = this.messageRepo.create({ ...dto, conversation_id: conversationId });
    const saved = await this.messageRepo.save(msg);

    // Update conversation snapshot
    await this.conversationRepo.update(conversationId, {
      last_message: dto.content.substring(0, 200),
      last_message_at: new Date(),
      unread_count: dto.sender_type === 'user' ? conv.unread_count + 1 : conv.unread_count,
    });

    return saved;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    });
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.messageRepo.update(
      { conversation_id: conversationId, is_read: false, sender_type: 'user' },
      { is_read: true },
    );
    await this.conversationRepo.update(conversationId, { unread_count: 0 });
  }

  async ingestInstagramMessage(payload: {
    senderId: string;
    messageId: string;
    text: string;
    username?: string;
    timestamp: string;
  }): Promise<Message> {
    const conv = await this.findOrCreateByPhone(payload.senderId, 'instagram', payload.username);

    const existing = await this.messageRepo.findOne({
      where: { whatsapp_message_id: payload.messageId },
    });
    if (existing) return existing;

    return this.addMessage(conv.id, {
      content: payload.text,
      sender_type: 'user',
      sender_name: payload.username || payload.senderId,
      whatsapp_message_id: payload.messageId,
      metadata: { timestamp: payload.timestamp, channel: 'instagram' },
    });
  }

  async ingestWhatsAppMessage(payload: {
    from: string;
    messageId: string;
    body: string;
    profileName?: string;
    timestamp: string;
  }): Promise<Message> {
    const conv = await this.findOrCreateByPhone(payload.from, 'whatsapp', payload.profileName);

    // Avoid duplicate ingestion
    const existing = await this.messageRepo.findOne({
      where: { whatsapp_message_id: payload.messageId },
    });
    if (existing) return existing;

    return this.addMessage(conv.id, {
      content: payload.body,
      sender_type: 'user',
      sender_name: payload.profileName || payload.from,
      whatsapp_message_id: payload.messageId,
      metadata: { timestamp: payload.timestamp },
    });
  }
}
