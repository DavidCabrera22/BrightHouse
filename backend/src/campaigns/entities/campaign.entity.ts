import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 15, scale: 2 })
  budget: number;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost_per_lead: number;

  @Column('int', { default: 0 })
  leads_generated: number;
}
