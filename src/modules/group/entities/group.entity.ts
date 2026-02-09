import { BaseEntity } from 'src/common/database/baseEntity';
import { GenderEnum } from 'src/common/enums/enum';
import { GroupStatusEnum } from 'src/common/enums/group-status.enum';
import { Lecture } from 'src/modules/lecture/entities/lecture.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('groups')
export class Group extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: "enum", enum: GenderEnum })
    gender: GenderEnum // MALE yoki FEMALE

    @Column({ type: 'int', nullable: false, default: 0 })
    studentsCount: number;

    @Column({ type: "int", name: 'max_students', default: 12 })
    maxStudents: number

    @Column({ type: 'int', name: 'current_schedule_step', default: 0 })
    currentScheduleStep: number;

    @Column({ type: 'timestamp', name: 'fill_at', nullable: true })
    fillAt: Date // Guruh to'lgan vaqt

    @Column({ type: 'enum', enum: GroupStatusEnum, default: GroupStatusEnum.FILLING })
    status: GroupStatusEnum

    @OneToMany(() => User, (user) => user.group)
    users: User[]

    @OneToMany(() => Lecture, (lecture) => lecture.group)
    lectures: Lecture[]
}
