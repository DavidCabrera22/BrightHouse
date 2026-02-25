import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  source: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_agent_id' })
  assigned_agent: User;

  @Column({ nullable: true })
  assigned_agent_id: string;

  @Column({ default: 'new' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  potential_value: number;

  @Column({ type: 'int', nullable: true })
  ai_score: number;

  @Column({ nullable: true })
  priority: string;

  @Column({ nullable: true })
  interested_in: string;

  @CreateDateColumn()
  created_at: Date;
}
