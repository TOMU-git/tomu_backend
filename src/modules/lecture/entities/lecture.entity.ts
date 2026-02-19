import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Group } from '../../group/entities/group.entity';
import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

@Index(['endTime', 'startTime'])
@Entity('lectures')
export class Lecture extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'timestamp', name: 'start_time' })
    startTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date; // Hisoblangan: startTime + duration

    @Column({ type: 'int', nullable: true })
    duration: number;

    @Column({ type: 'int', default: 1 })
    order: number; // Darsning tartib raqami guruh ichida

    @Column({ type: 'enum', enum: LectureStatusEnum, default: LectureStatusEnum.SCHEDULED })
    status: LectureStatusEnum;

    @Column({ type: 'varchar', nullable: true })
    inviteLink: string; // Telegram guruh havolasi

    @Column({ type: 'timestamp', nullable: true, name: 'claimed_at' })
    claimedAt: Date; // Ustoz darsni qabul qilgan vaqt

    @Column({ type: 'varchar', nullable: true, name: 'telegram_message_id' })
    telegramMessageId: string; // Telegram guruhidagi xabar ID'si

    @Column({ type: 'boolean', default: false, name: 'reminder_sent' })
    reminderSent: boolean; // Eslatma yuborilganmi

    @ManyToOne(() => Group, (group) => group.lectures, { onDelete: 'CASCADE' })
    group: Group;

    @ManyToOne(() => User, { nullable: true })
    assignedTeacher: User; // Darsni olib boruvchi ustoz
}
