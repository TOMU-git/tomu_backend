import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

/**
 * Migration: Add Telegram Integration Fields
 * 
 * This migration adds Telegram-related fields to both users and lectures tables
 * to support teacher-lecture assignment via Telegram bot.
 * 
 * User table changes:
 * - telegram_chat_id: Teacher's Telegram chat ID
 * - telegram_group_link: Teacher's default group invite link
 * 
 * Lecture table changes:
 * - claimed_at: When the lecture was claimed by a teacher
 * - telegram_message_id: Telegram message ID for updates
 * - assigned_teacher_id: Foreign key to teacher who claimed the lecture
 */
export class AddTelegramIntegration1739426840186 implements MigrationInterface {
    name = 'AddTelegramIntegration1739426840186';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Telegram fields to users table
        await queryRunner.addColumn('users', new TableColumn({
            name: 'telegram_chat_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Teacher Telegram chat ID for bot communication'
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'telegram_group_link',
            type: 'text',
            isNullable: true,
            comment: 'Teacher default Telegram group invite link'
        }));

        // Add fields to lectures table
        await queryRunner.addColumn('lectures', new TableColumn({
            name: 'claimed_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when lecture was claimed by a teacher'
        }));

        await queryRunner.addColumn('lectures', new TableColumn({
            name: 'telegram_message_id',
            type: 'varchar',
            isNullable: true,
            comment: 'Telegram message ID for tracking notifications'
        }));

        await queryRunner.addColumn('lectures', new TableColumn({
            name: 'assigned_teacher_id',
            type: 'bigint',
            isNullable: true,
            comment: 'Teacher who is assigned to conduct this lecture'
        }));

        // Add foreign key constraint for assigned_teacher_id
        await queryRunner.createForeignKey('lectures', new TableForeignKey({
            name: 'FK_lecture_assigned_teacher',
            columnNames: ['assigned_teacher_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
        }));

        // Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_lectures_assigned_teacher" 
            ON "lectures" ("assigned_teacher_id");
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_lectures_claimed_at" 
            ON "lectures" ("claimed_at");
        `);

        console.log('✅ Telegram integration migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_lectures_claimed_at";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_lectures_assigned_teacher";`);

        // Drop foreign key
        await queryRunner.dropForeignKey('lectures', 'FK_lecture_assigned_teacher');

        // Drop columns from lectures table
        await queryRunner.dropColumn('lectures', 'assigned_teacher_id');
        await queryRunner.dropColumn('lectures', 'telegram_message_id');
        await queryRunner.dropColumn('lectures', 'claimed_at');

        // Drop columns from users table
        await queryRunner.dropColumn('users', 'telegram_group_link');
        await queryRunner.dropColumn('users', 'telegram_chat_id');

        console.log('✅ Telegram integration migration rolled back successfully');
    }
}
