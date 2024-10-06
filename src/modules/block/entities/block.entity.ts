import { BaseEntity } from 'src/common/database/baseEntity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity'; // Importni tekshiring
import { Course } from 'src/modules/course/entities/course.entity'; // Importni tekshiring
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('blocks')
export class Block extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int' })
  price: number;

  @ManyToOne(() => Course, (course) => course.blocks)
  @JoinColumn({ name: 'course_id' })
  course: Course; // Kurs bilan bog'liq

  @OneToMany(() => Lesson, (lesson) => lesson.block, { onDelete: 'NO ACTION' })
  lessons: Lesson[]; // Darslar bilan bog'liq
}
