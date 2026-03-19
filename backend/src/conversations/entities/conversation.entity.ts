import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, { nullable: true, eager: false })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ nullable: true })
  lead_id: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'assigned_agent_id' })
  assigned_agent: User;

  @Column({ nullable: true })
  assigned_agent_id: string;

  @Column({ default: 'whatsapp' })
  channel: string; // whatsapp | email | webchat

  @Column({ default: 'open' })
  status: string; // open | closed | archived

  @Column({ nullable: true })
  contact_name: string;

  @Column({ nullable: true })
  contact_phone: string;

  @Column({ nullable: true })
  contact_email: string;

  @Column({ nullable: true })
  last_message: string;

  @Column({ nullable: true, type: 'timestamp' })
  last_message_at: Date;

  @Column({ default: 0 })
  unread_count: number;

  @Column({ nullable: true })
  whatsapp_waid: string; // WhatsApp Account ID / phone number ID

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];
}
