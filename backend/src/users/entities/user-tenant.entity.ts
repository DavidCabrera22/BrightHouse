import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Tenants adicionales de un usuario, además de `users.tenant_id` (el principal).
 *
 * El token sigue llevando un solo tenant activo, así que el aislamiento no
 * cambia: el usuario cambia de tenant pidiendo un token nuevo en
 * `POST /api/auth/switch-tenant`, que valida contra esta tabla. Solo un
 * SuperAdmin escribe aquí.
 *
 * `tenant_id` es varchar, igual que `users.tenant_id`, para que el predicado de
 * pertenencia en TenantScopeService compare tipos iguales.
 */
@Entity('user_tenants')
export class UserTenant {
  @PrimaryColumn('uuid')
  user_id: string;

  @PrimaryColumn()
  tenant_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
