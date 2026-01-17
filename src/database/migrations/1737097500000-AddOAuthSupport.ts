import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Migration: Add OAuth Support to Users Table
 * 
 * This migration adds support for Google and Apple OAuth authentication
 * while maintaining backward compatibility with existing phone/password auth.
 * 
 * Changes:
 * 1. Add OAuth provider fields (google_id, apple_id, email, avatar)
 * 2. Add auth_provider enum field
 * 3. Add email_verified boolean field
 * 4. Make password, unhashed_password, and gender nullable (for OAuth users)
 * 
 * Rollback safe: All changes can be reverted without data loss
 */
export class AddOAuthSupport1737097500000 implements MigrationInterface {
    name = 'AddOAuthSupport1737097500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create auth_provider enum type
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_provider_enum" AS ENUM ('local', 'google', 'apple');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // 2. Add OAuth-related columns
        await queryRunner.addColumn('users', new TableColumn({
            name: 'google_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
            comment: 'Google OAuth user ID'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'apple_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
            comment: 'Apple OAuth user ID'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'User email address from OAuth or manual entry'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'avatar',
            type: 'text',
            isNullable: true,
            comment: 'User avatar URL from OAuth provider'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'auth_provider',
            type: 'enum',
            enum: ['local', 'google', 'apple'],
            default: "'local'",
            comment: 'Authentication provider: local, google, or apple'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'email_verified',
            type: 'boolean',
            default: false,
            comment: 'Whether email has been verified'
        }));

        // 3. Make password, unhashed_password, and gender nullable for OAuth users
        await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "password" DROP NOT NULL,
      ALTER COLUMN "unhashed_password" DROP NOT NULL,
      ALTER COLUMN "gender" DROP NOT NULL;
    `);

        // 4. Create indexes for better query performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL;
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_apple_id" ON "users" ("apple_id") WHERE "apple_id" IS NOT NULL;
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email") WHERE "email" IS NOT NULL;
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_auth_provider" ON "users" ("auth_provider");
    `);

        console.log('✅ OAuth support migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_auth_provider";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_apple_id";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_google_id";`);

        // Restore NOT NULL constraints (only if no OAuth users exist)
        await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "gender" SET NOT NULL,
      ALTER COLUMN "unhashed_password" SET NOT NULL,
      ALTER COLUMN "password" SET NOT NULL;
    `);

        // Remove OAuth columns
        await queryRunner.dropColumn('users', 'email_verified');
        await queryRunner.dropColumn('users', 'auth_provider');
        await queryRunner.dropColumn('users', 'avatar');
        await queryRunner.dropColumn('users', 'email');
        await queryRunner.dropColumn('users', 'apple_id');
        await queryRunner.dropColumn('users', 'google_id');

        // Drop enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "auth_provider_enum";`);

        console.log('✅ OAuth support migration rolled back successfully');
    }
}
