import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './User';

@Entity('user_preferences')
export class UserPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_walking_distance' })
  maxWalkingDistance!: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'preferred_modes' })
  preferredModes!: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'accessibility_needs' })
  accessibilityNeeds!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'sustainability_priority' })
  sustainabilityPriority!: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'time_vs_environment_weight' })
  timeVsEnvironmentWeight!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToOne(() => UserEntity, user => user.preferences)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
