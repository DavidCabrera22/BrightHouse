import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column()
  conversation_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'user' })
  sender_type: string; // user | agent | bot

  @Column({ nullable: true })
  sender_name: string;

  @Column({ nullable: true })
  sender_id: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ nullable: true })
  whatsapp_message_id: string; // External WhatsApp message ID

  @Column({ type: 'jsonb', nullable: true })
  metadata: object;

  @CreateDateColumn()
  created_at: Date;
}
