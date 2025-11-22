import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTripsTable1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'trips',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'origin_lat',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'origin_lng',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'origin_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'destination_lat',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'destination_lng',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'destination_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'selected_route',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'actual_transportation_mode',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'carbon_savings',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'distance',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'trips',
      new TableForeignKey({
        name: 'fk_trips_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create indexes
    await queryRunner.createIndex(
      'trips',
      new TableIndex({
        name: 'idx_trips_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'trips',
      new TableIndex({
        name: 'idx_trips_completed_at',
        columnNames: ['completed_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('trips', 'idx_trips_completed_at');
    await queryRunner.dropIndex('trips', 'idx_trips_user_id');
    await queryRunner.dropForeignKey('trips', 'fk_trips_user');
    await queryRunner.dropTable('trips');
  }
}
