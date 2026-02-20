import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { UnitStatus } from '../../unit-statuses/entities/unit-status.entity';
import { User } from '../../users/entities/user.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column()
  code: string;

  @Column()
  tower: string;

  @Column()
  floor: string;

  @Column('decimal', { precision: 10, scale: 2 })
  area: number;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @ManyToOne(() => UnitStatus)
  @JoinColumn({ name: 'current_status_id' })
  current_status: UnitStatus;

  @Column()
  current_status_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_agent_id' })
  assigned_agent: User;

  @Column({ nullable: true })
  assigned_agent_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
