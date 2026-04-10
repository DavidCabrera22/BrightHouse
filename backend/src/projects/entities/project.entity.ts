import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  location: string;

  @Column('int', { default: 0 })
  total_units: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true, unique: true })
  slug: string;

  @Column({ nullable: true })
  marketing_plan_type: string;

  @Column({ nullable: true })
  tenant_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
