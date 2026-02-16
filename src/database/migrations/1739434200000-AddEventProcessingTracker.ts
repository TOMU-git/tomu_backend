import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

/**
 * Migration: Add Event Processing Tracker for Idempotency
 * 
 * Bu table eventlarni qayta ishlanmaslik uchun tracking qiladi.
 */
export class AddEventProcessingTracker1739434200000 implements MigrationInterface {
    name = 'AddEventProcessingTracker1739434200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'event_processing_tracker',
                columns: [
                    {
                        name: 'id',
                        type: 'bigint',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'event_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'processed'",
                    },
                    {
                        name: 'telegram_message_id',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Unique constraint for idempotency
        await queryRunner.createIndex(
            'event_processing_tracker',
            new TableIndex({
                name: 'IDX_event_type_event_id',
                columnNames: ['event_type', 'event_id'],
                isUnique: true,
            }),
        );

        // Index for cleanup queries
        await queryRunner.createIndex(
            'event_processing_tracker',
            new TableIndex({
                name: 'IDX_processed_at',
                columnNames: ['processed_at'],
            }),
        );

        console.log('✅ Event processing tracker migration completed');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('event_processing_tracker', 'IDX_processed_at');
        await queryRunner.dropIndex('event_processing_tracker', 'IDX_event_type_event_id');
        await queryRunner.dropTable('event_processing_tracker');

        console.log('✅ Event processing tracker migration rolled back');
    }
}
