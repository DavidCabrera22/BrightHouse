import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('day_tasks')
@Index('UQ_day_task_source', ['owner_id', 'source_key'], { unique: true })
@Index('IDX_day_task_owner_due', ['owner_id', 'due_at'])
export class DayTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;
  @Column('uuid') owner_id: string;
  @ManyToOne(() => Lead, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
  @Column({ type: 'uuid', nullable: true }) lead_id: string | null;
  @Column({ nullable: true }) source_key: string | null;
  @Column() kind: string;
  @Column({ length: 160 }) title: string;
  @Column({ type: 'timestamptz' }) due_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
}
