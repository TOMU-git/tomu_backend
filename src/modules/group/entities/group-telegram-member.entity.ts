import { BaseEntity } from 'src/common/database/baseEntity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Group } from './group.entity';

@Entity('group_telegram_members')
export class GroupTelegramMember extends BaseEntity {
    @Column({ type: 'varchar', length: 255, name: 'telegram_user_id' })
    telegramUserId: string;

    @Column({ type: 'varchar', length: 255, name: 'telegram_chat_id' })
    telegramChatId: string; // Guruhning Telegram chat ID si

    @Column({ type: 'int', name: 'group_id', nullable: true })
    groupId: number;

    @ManyToOne(() => Group, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'group_id' })
    group: Group;
}
