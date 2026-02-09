import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Group } from '../../group/entities/group.entity';
import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

@Index(['day', 'startTime'])
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

    @Column({ type: 'enum', enum: LectureStatusEnum, default: LectureStatusEnum.SCHEDULED })
    status: LectureStatusEnum;

    @Column({ type: 'varchar', nullable: true })
    inviteLink: string; // Telegram guruh havolasi

    @ManyToOne(() => Group, (group) => group.lectures, { onDelete: 'CASCADE' })
    group: Group;

    @ManyToOne(() => User, (user) => user.lectures)
    user: User;
}
