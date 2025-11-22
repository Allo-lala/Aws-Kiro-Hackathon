import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateApiKeysTable1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'service_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'key_value',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rotated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'idx_api_keys_service_name',
        columnNames: ['service_name'],
      })
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'idx_api_keys_is_active',
        columnNames: ['is_active'],
      })
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'idx_api_keys_expires_at',
        columnNames: ['expires_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('api_keys', 'idx_api_keys_expires_at');
    await queryRunner.dropIndex('api_keys', 'idx_api_keys_is_active');
    await queryRunner.dropIndex('api_keys', 'idx_api_keys_service_name');

    // Drop table
    await queryRunner.dropTable('api_keys');
  }
}
