import { BaseEntity } from 'src/common/database/baseEntity';
import { Course } from 'src/modules/course/entities/course.entity';
import { UserTariff } from 'src/modules/user-tariff/entities/user-tariff.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('tariffs')
export class Tariff extends BaseEntity {
  @Column({ type: 'varchar', length: 256, nullable: false })
  name: string;

  @Column({ type: 'int', nullable: false })
  duration: number;

  @Column({ type: 'text', nullable: false })
  description: string;

  @OneToMany(() => UserTariff, (userTariff) => userTariff.tariff, {
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  userTariffs: UserTariff[];

  @ManyToOne(() => Course, (course) => course.tariffs)
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
