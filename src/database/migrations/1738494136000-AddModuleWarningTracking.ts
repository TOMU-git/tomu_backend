import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Migration: Add Module Warning Tracking to UserCourse Table
 * 
 * This migration adds fields to track when module completion warnings
 * were last shown to users, enabling daily warning limits.
 * 
 * Changes:
 * 1. Add last_module_warning_shown_at timestamp field
 * 2. Add last_module_warning_block_order integer field
 * 
 * These fields track when a user was last warned about incomplete
 * previous modules, preventing repeated warnings on the same day.
 */
export class AddModuleWarningTracking1738494136000 implements MigrationInterface {
    name = 'AddModuleWarningTracking1738494136000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add last_module_warning_shown_at column
        await queryRunner.addColumn('user_courses', new TableColumn({
            name: 'last_module_warning_shown_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when module completion warning was last shown to user'
        }));

        // Add last_module_warning_block_order column
        await queryRunner.addColumn('user_courses', new TableColumn({
            name: 'last_module_warning_block_order',
            type: 'int',
            isNullable: true,
            comment: 'Block order number for which the warning was shown'
        }));

        // Create index for better query performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_courses_warning_tracking" 
      ON "user_courses" ("last_module_warning_shown_at", "last_module_warning_block_order");
    `);

        console.log('✅ Module warning tracking migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_courses_warning_tracking";`);

        // Remove columns
        await queryRunner.dropColumn('user_courses', 'last_module_warning_block_order');
        await queryRunner.dropColumn('user_courses', 'last_module_warning_shown_at');

        console.log('✅ Module warning tracking migration rolled back successfully');
    }
}
