import { BaseEntity } from 'src/common/database/baseEntity';
import { Course } from 'src/modules/course/entities/course.entity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, ManyToOne, OneToMany } from 'typeorm';

export class Module extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  order: number;

  @ManyToOne(() => Course, (course) => course.modules)
  course: Course;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Lesson, (lesson) => lesson.module)
  lessons: Lesson[];
}
