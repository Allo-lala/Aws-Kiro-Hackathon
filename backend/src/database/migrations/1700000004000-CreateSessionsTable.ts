import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSessionsTable1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
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
            name: 'token',
            type: 'varchar',
            length: '500',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'sessions',
      new TableForeignKey({
        name: 'fk_sessions_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create indexes
    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'idx_sessions_token',
        columnNames: ['token'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'idx_sessions_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'idx_sessions_expires_at',
        columnNames: ['expires_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sessions', 'idx_sessions_expires_at');
    await queryRunner.dropIndex('sessions', 'idx_sessions_user_id');
    await queryRunner.dropIndex('sessions', 'idx_sessions_token');
    await queryRunner.dropForeignKey('sessions', 'fk_sessions_user');
    await queryRunner.dropTable('sessions');
  }
}
