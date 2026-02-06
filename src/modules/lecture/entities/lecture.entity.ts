import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Group } from '../../group/entities/group.entity';
import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';

@Index(['day', 'startTime'])
@Entity('lectures')
export class Lecture extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'date' })
    day: Date;

    @Column({ type: 'timestamp', name: 'start_time' })
    startTime: Date;

    @Column({ type: 'int', nullable: true})
    duration: number;

    @Column({ type: 'varchar', name: 'bot_url', nullable: true })
    botUrl: string;

    @ManyToOne(() => Group, (group) => group.lectures, { onDelete: 'CASCADE' })
    group: Group;

    @ManyToOne(() => User, (user) => user.lectures)
    user: User;
}
