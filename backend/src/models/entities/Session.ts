import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './User';

@Entity('sessions')
@Index(['token'])
@Index(['userId'])
@Index(['expiresAt'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token!: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent!: string | null;

  // Relations
  @ManyToOne(() => UserEntity, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
