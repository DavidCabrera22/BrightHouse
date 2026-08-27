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
import { decimalTransformer } from './decimal-transformer';

@Entity('quotes')
// El consecutivo es por proyecto y por año; el índice es lo que arbitra dos
// agentes guardando en el mismo instante.
// Con nombre explícito: el reintento del consecutivo tiene que reconocer que
// el 23505 vino de esta restricción y no de otra, y Postgres la reporta por
// nombre. Un hash autogenerado además cambia si cambian las columnas.
@Index('UQ_quotes_project_code', ['project_id', 'code'], { unique: true })
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
