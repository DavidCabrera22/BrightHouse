import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Sale } from '../../sales/entities/sale.entity';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Sale)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column()
  sale_id: string;

  @Column('decimal', { precision: 5, scale: 2 })
  agent_percentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  platform_percentage: number;

  @Column('decimal', { precision: 15, scale: 2 })
  total_commission: number;

  @Column('decimal', { precision: 15, scale: 2 })
  agent_commission: number;

  @Column('decimal', { precision: 15, scale: 2 })
  platform_commission: number;

  @Column({ default: 'Projected' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
