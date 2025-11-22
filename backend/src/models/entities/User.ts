import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, Index } from 'typeorm';
import { UserPreferencesEntity } from './UserPreferences';
import { TripEntity } from './Trip';
import { SessionEntity } from './Session';
import { AuditLogEntity } from './AuditLog';

@Entity('users')
@Index(['email'])
@Index(['isActive'])
@Index(['emailVerificationToken'])
@Index(['passwordResetToken'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_admin' })
  isAdmin!: boolean;

  @Column({ type: 'integer', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'account_locked_until' })
  accountLockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'email_verification_token' })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'email_verification_token_expires' })
  emailVerificationTokenExpires!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_reset_token' })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'password_reset_token_expires' })
  passwordResetTokenExpires!: Date | null;

  // Relations
  @OneToOne(() => UserPreferencesEntity, preferences => preferences.user)
  preferences?: UserPreferencesEntity;

  @OneToMany(() => TripEntity, trip => trip.user)
  trips?: TripEntity[];

  @OneToMany(() => SessionEntity, session => session.user)
  sessions?: SessionEntity[];

  @OneToMany(() => AuditLogEntity, auditLog => auditLog.admin)
  adminActions?: AuditLogEntity[];

  @OneToMany(() => AuditLogEntity, auditLog => auditLog.targetUser)
  auditLogsAsTarget?: AuditLogEntity[];
}
