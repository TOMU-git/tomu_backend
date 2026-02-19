import { BaseEntity } from 'src/common/database/baseEntity';
import { GenderEnum } from 'src/common/enums/enum';
import { GroupStatusEnum } from 'src/common/enums/group-status.enum';
import { Lecture } from 'src/modules/lecture/entities/lecture.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Course } from 'src/modules/course/entities/course.entity';
import { Column, Entity, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

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

    @Column({ name: 'course_id', type: 'int', nullable: false })
    courseId: number;

    @Column({ type: 'timestamp', name: 'start_date', nullable: true })
    startDate: Date; // Guruh darslari boshlanish sanasi (fillAt + 3 kun)

    @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
    completedAt: Date; // Guruh barcha darslarini tugatgan vaqt

    @ManyToOne(() => Course, (course) => course.groups, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @OneToMany(() => User, (user) => user.group)
    users: User[]

    @OneToMany(() => Lecture, (lecture) => lecture.group)
    lectures: Lecture[]
}
