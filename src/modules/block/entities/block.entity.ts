import { BaseEntity } from 'src/common/database/baseEntity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Course } from 'src/modules/course/entities/course.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity('blocks')
export class Block extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ManyToOne(() => Course, (course) => course.blocks)
  course: Course; // Kurs bilan bog'liq

  @OneToMany(() => Lesson, (lesson) => lesson.block)
  lessons: Lesson[]; // Darslar bilan bog'liq
}
