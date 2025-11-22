import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './User';

@Entity('audit_logs')
@Index(['adminId'])
@Index(['timestamp'])
@Index(['action'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'admin_id' })
  adminId!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'uuid', nullable: true, name: 'target_user_id' })
  targetUserId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  // Relations
  @ManyToOne(() => UserEntity, user => user.adminActions)
  @JoinColumn({ name: 'admin_id' })
  admin!: UserEntity;

  @ManyToOne(() => UserEntity, user => user.auditLogsAsTarget, { nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: UserEntity | null;
}
