import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column()
  action: string;

  @Column()
  entity: string;

  @Column()
  entity_id: string;

  @Column('json', { nullable: true })
  old_data: any;

  @Column('json', { nullable: true })
  new_data: any;

  @CreateDateColumn()
  timestamp: Date;
}
