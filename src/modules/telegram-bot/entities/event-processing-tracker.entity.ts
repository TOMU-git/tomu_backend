import { BaseEntity } from 'src/common/database/baseEntity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Event Processing Tracker
 * 
 * Bu entity eventlarni qayta ishlanmasli uchun tracking qiladi.
 * Agar bir xil event ID ikki marta kelsa, ikkinchisini ignore qilamiz.
 */
@Entity('event_processing_tracker')
@Index(['eventType', 'eventId'], { unique: true })
export class EventProcessingTracker extends BaseEntity {

    @Column({ name: 'event_type', type: 'varchar', length: 100 })
    eventType: string; // Masalan: 'lecture.created'

    @Column({ name: 'event_id', type: 'varchar', length: 255 })
    eventId: string; // Lecture ID yoki boshqa unique identifier

    @Column({ name: 'processed_at', type: 'timestamp' })
    processedAt: Date;

    @Column({ name: 'status', type: 'varchar', length: 50, default: 'processed' })
    status: string; // 'processed', 'failed', 'skipped'

    @Column({ name: 'telegram_message_id', type: 'varchar', nullable: true })
    telegramMessageId: string; // Yuborilgan xabar ID

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;
}
