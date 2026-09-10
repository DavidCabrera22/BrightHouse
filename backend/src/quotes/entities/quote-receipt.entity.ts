import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Quote } from './quote.entity';
import { User } from '../../users/entities/user.entity';
import { CalculatedInstallment } from '../quote-calculator';

@Entity('quote_receipts')
@Index('IDX_quote_receipts_quote', ['quote_id'])
export class QuoteReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quote, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column('uuid')
  quote_id: string;

  // Nunca se devuelve el identificador del archivo privado en las listas.
  @Column({ select: false })
  storage_public_id: string;

  @Column({ length: 255 })
  original_name: string;

  @Column({ length: 100 })
  mime_type: string;

  @Column('int')
  file_size: number;

  /** Conserva la referencia original aunque se regenere el cronograma. */
  @Column({ type: 'jsonb', nullable: true })
  installment_snapshot: CalculatedInstallment | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploaded_by_user: User;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @CreateDateColumn()
  created_at: Date;
}
