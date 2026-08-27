import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quote } from './quote.entity';
import { decimalTransformer } from './decimal-transformer';

/**
 * Una fila por pago del cronograma. Se guardan en vez de recalcularse para que
 * la cotización siga diciendo lo mismo aunque cambie el precio de la unidad.
 */
@Entity('quote_installments')
// Postgres no indexa las claves foráneas solo. Sin este índice, el ON DELETE
// CASCADE del que depende el borrado de una cotización recorre la tabla entera,
// que es la más grande de la función: unas catorce filas por cotización.
@Index('IDX_quote_installments_quote', ['quote_id'])
export class QuoteInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quote, (quote) => quote.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column()
  quote_id: string;

  @Column('int')
  number: number;

  /** 'separacion' | 'cuota' | 'saldo' */
  @Column()
  concept: string;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'date' })
  due_date: string;

  @CreateDateColumn()
  created_at: Date;
}
