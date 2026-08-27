import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Automation } from './automation.entity';
import { Lead } from '../../leads/entities/lead.entity';

/**
 * One execution of an automation against one lead.
 *
 * Doubles as the dedup key: the unique pair stops a recurring trigger such as
 * `lead_idle` from re-sending the same message on every scan.
 */
@Entity('automation_runs')
@Unique('uq_automation_run_lead', ['automation_id', 'lead_id'])
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Automation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'automation_id' })
  automation: Automation;

  @Column()
  automation_id: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column()
  lead_id: string;

  @Column({ default: 'success' })
  status: 'success' | 'failed';

  @Column({ nullable: true })
  detail: string;

  @CreateDateColumn()
  created_at: Date;
}
