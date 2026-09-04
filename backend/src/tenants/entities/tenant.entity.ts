import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string; // used for webhook URL: /api/webhooks/whatsapp?tenant=slug

  @Column({ nullable: true })
  logo_url: string;

  @Column({ default: 'basic' })
  plan: string;

  @Column({ default: 'active' })
  status: string;

  // WhatsApp (Whapi) credentials per tenant
  @Column({ nullable: true })
  whapi_token: string;

  @Column({ nullable: true })
  whapi_api_url: string;

  // Instagram credentials (future)
  @Column({ nullable: true })
  instagram_token: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  // Default project for incoming leads from this tenant's channels
  @Column({ nullable: true })
  default_project_id: string;

  /**
   * Asesor que atiende el chatbot: se queda los leads que entran solos por
   * WhatsApp o Instagram. Los que un asesor crea a mano en el CRM siguen
   * quedando a nombre de quien los crea.
   */
  @Column({ nullable: true })
  default_agent_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
