import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('digital_signatures')
export class DigitalSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column()
  document_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'signed_by_user_id' })
  signed_by_user: User;

  @Column()
  signed_by_user_id: string;

  @Column({ nullable: true })
  signature_type: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  device_info: string;

  @Column({ nullable: true })
  hash_sha256: string;

  @CreateDateColumn()
  timestamp_signed: Date;

  @Column({ nullable: true })
  verification_code: string;

  @Column({ default: 'pending' })
  status: string;
}
