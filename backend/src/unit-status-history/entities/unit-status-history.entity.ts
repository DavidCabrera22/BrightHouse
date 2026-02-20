import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { UnitStatus } from '../../unit-statuses/entities/unit-status.entity';
import { User } from '../../users/entities/user.entity';

@Entity('unit_status_history')
export class UnitStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column()
  unit_id: string;

  @ManyToOne(() => UnitStatus, { nullable: true })
  @JoinColumn({ name: 'previous_status_id' })
  previous_status: UnitStatus;

  @Column({ nullable: true })
  previous_status_id: string;

  @ManyToOne(() => UnitStatus)
  @JoinColumn({ name: 'new_status_id' })
  new_status: UnitStatus;

  @Column()
  new_status_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by_user_id' })
  changed_by_user: User;

  @Column()
  changed_by_user_id: string;

  @CreateDateColumn()
  change_date: Date;

  @Column({ nullable: true })
  notes: string;
}
