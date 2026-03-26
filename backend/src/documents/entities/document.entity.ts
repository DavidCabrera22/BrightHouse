import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ nullable: true })
  unit_id: string;

  @Column()
  document_type: string;

  @Column()
  file_url: string;

  @Column({ nullable: true })
  original_name: string;

  @Column({ nullable: true })
  file_size: number;

  @Column({ default: '1.0' })
  version: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploaded_by_user: User;

  @Column()
  uploaded_by: string;

  @Column({ default: false })
  requires_signature: boolean;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
