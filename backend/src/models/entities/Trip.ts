import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './User';

@Entity('trips')
@Index(['userId'])
@Index(['completedAt'])
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'origin_lat' })
  originLat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'origin_lng' })
  originLng!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'origin_name' })
  originName!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'destination_lat' })
  destinationLat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'destination_lng' })
  destinationLng!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'destination_name' })
  destinationName!: string | null;

  @Column({ type: 'jsonb', name: 'selected_route' })
  selectedRoute!: Record<string, any>;

  @Column({ type: 'varchar', length: 100, name: 'actual_transportation_mode' })
  actualTransportationMode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true, name: 'carbon_savings' })
  carbonSavings!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance!: number | null;

  @Column({ type: 'integer', nullable: true })
  duration!: number | null;

  @Column({ type: 'timestamp', name: 'completed_at' })
  completedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => UserEntity, user => user.trips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
