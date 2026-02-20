import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('unit_statuses')
export class UnitStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  color_hex: string;

  @Column({ default: false })
  triggers_commission: boolean;

  @Column({ default: false })
  triggers_signature: boolean;

  @Column('int', { default: 0 })
  order_sequence: number;
}
