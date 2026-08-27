import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

/** What makes an automation fire. */
export type TriggerType = 'lead_created' | 'lead_status_changed' | 'lead_idle';

/** What it does when it fires. */
export type ActionType = 'send_whatsapp' | 'change_lead_status' | 'assign_agent';

export type AutomationStatus = 'active' | 'paused' | 'draft';

/**
 * A trigger/action rule scoped to one project.
 *
 * Tenant isolation rides on project_id - see common/tenant/tenant-paths.ts.
 */
@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column()
  name: string;

  @Column({ default: 'draft' })
  status: AutomationStatus;

  @Column()
  trigger_type: TriggerType;

  /**
   * Shape depends on trigger_type:
   *   lead_created         { source?: string }
   *   lead_status_changed  { to_status: string }
   *   lead_idle            { status?: string, days: number }
   */
  @Column({ type: 'jsonb', default: {} })
  trigger_config: Record<string, any>;

  @Column()
  action_type: ActionType;

  /**
   * Shape depends on action_type:
   *   send_whatsapp        { message: string }
   *   change_lead_status   { status: string }
   *   assign_agent         { agent_id: string }
   */
  @Column({ type: 'jsonb', default: {} })
  action_config: Record<string, any>;

  @Column('int', { default: 0 })
  runs_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_run_at: Date;

  /** Last failure, surfaced in the UI so a silent misconfiguration is visible. */
  @Column({ nullable: true })
  last_error: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
