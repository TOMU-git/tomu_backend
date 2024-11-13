import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity } from "typeorm";


@Entity('user_livechats')
export class UserLivechatEntity extends BaseEntity {
    @Column({ name: 'user_id', type: 'int', nullable: false })
    userId: number;

    @Column({ name: 'live_chat_id', type: 'int', nullable: false })
    liveChatId: number;

    @Column({ name: 'teacher_id', type: 'int', nullable: false })
    teacherId: number;

    @Column({ name: 'course_id', type: 'varchar', nullable: false })
    courseId: number;

    @Column({ name: 'is_accepted', type: 'boolean', nullable: false })
    isAccepted: boolean;

    @Column({ name: 'meeting_date', type: 'date', nullable: false })
    meetingDate: Date;

    @Column({ name: 'meeting_time', type: 'varchar', nullable: false })
    meetingTime: string;

    @Column({ name: 'meeting_url', type: 'varchar', nullable: false })
    meetingUrl: string;
}

