import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserPreferencesTable1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
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
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'max_walking_distance',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'preferred_modes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'accessibility_needs',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sustainability_priority',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'time_vs_environment_weight',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
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
      'user_preferences',
      new TableForeignKey({
        name: 'fk_user_preferences_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('user_preferences', 'fk_user_preferences_user');
    await queryRunner.dropTable('user_preferences');
  }
}
