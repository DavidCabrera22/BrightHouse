import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Unit } from '../../units/entities/unit.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { QuoteInstallment } from './quote-installment.entity';

/**
 * `pg` devuelve los `numeric` como cadena. Sin esto, `total_value` llegaría
 * como "320000000.00" y cualquier suma en el servicio o en el PDF concatenaría
 * en vez de sumar.
 */
export const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('quotes')
// El consecutivo es por proyecto y por año; el índice es lo que arbitra dos
// agentes guardando en el mismo instante.
@Index(['project_id', 'code'], { unique: true })
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column()
  unit_id: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column()
  client_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column()
  agent_id: string;

  @Column()
  code: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'date' })
  quote_date: string;

  @Column({ type: 'date' })
  valid_until: string;

  /** Precio de la unidad el día de la cotización, congelado a propósito. */
  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  unit_price: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, transformer: decimalTransformer })
  discount: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  total_value: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, transformer: decimalTransformer })
  reservation_amount: number;

  @Column('decimal', { precision: 5, scale: 2, transformer: decimalTransformer })
  down_payment_percent: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  down_payment_value: number;

  @Column('int')
  installments_count: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  installment_amount: number;

  @Column({ type: 'date' })
  first_installment_date: string;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  balance_value: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => QuoteInstallment, (installment) => installment.quote, { cascade: ['insert'] })
  installments: QuoteInstallment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
