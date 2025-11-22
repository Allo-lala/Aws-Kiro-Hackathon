import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'admin_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'target_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
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
        ],
      }),
      true
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'fk_audit_logs_admin',
        columnNames: ['admin_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      })
    );

    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'fk_audit_logs_target_user',
        columnNames: ['target_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Create indexes
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_admin_id',
        columnNames: ['admin_id'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_timestamp',
        columnNames: ['timestamp'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_action',
        columnNames: ['action'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('audit_logs', 'idx_audit_logs_action');
    await queryRunner.dropIndex('audit_logs', 'idx_audit_logs_timestamp');
    await queryRunner.dropIndex('audit_logs', 'idx_audit_logs_admin_id');
    await queryRunner.dropForeignKey('audit_logs', 'fk_audit_logs_target_user');
    await queryRunner.dropForeignKey('audit_logs', 'fk_audit_logs_admin');
    await queryRunner.dropTable('audit_logs');
  }
}
