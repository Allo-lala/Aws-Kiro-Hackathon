import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationTokens1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email verification token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verification_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    // Add email verification token expiration column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verification_token_expires',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Add password reset token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    // Add password reset token expiration column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token_expires',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Create index on email verification token for faster lookups
    await queryRunner.query(
      `CREATE INDEX "idx_users_email_verification_token" ON "users" ("email_verification_token")`
    );

    // Create index on password reset token for faster lookups
    await queryRunner.query(
      `CREATE INDEX "idx_users_password_reset_token" ON "users" ("password_reset_token")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "idx_users_password_reset_token"`);
    await queryRunner.query(`DROP INDEX "idx_users_email_verification_token"`);

    // Drop columns
    await queryRunner.dropColumn('users', 'password_reset_token_expires');
    await queryRunner.dropColumn('users', 'password_reset_token');
    await queryRunner.dropColumn('users', 'email_verification_token_expires');
    await queryRunner.dropColumn('users', 'email_verification_token');
  }
}
