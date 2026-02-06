import { BaseEntity } from 'src/common/database/baseEntity';
import { Lecture } from 'src/modules/lecture/entities/lecture.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('groups')
export class Group extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'int', nullable: false, default: 0 })
    studentsCount: number;

    @OneToMany(() => User, (user) => user.group)
    users: User[]

    @OneToMany(() => Lecture, (lecture) => lecture.group)
    lectures: Lecture[]
}
