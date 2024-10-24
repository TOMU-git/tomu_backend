import { BaseEntity } from 'src/common/database/baseEntity';
import { Course } from 'src/modules/course/entities/course.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('grammars')
export class Grammar extends BaseEntity {
  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', name: 'grammar_text' })
  grammarText: string;

  @ManyToOne(() => Course, (course) => course.grammars, {
    onDelete: 'NO ACTION', // Kurs o'chirilganda hech narsa bo'lmaydi
  })
  @JoinColumn({ name: 'course_id' })
  course: Course; // Kurs bilan bog'liq
}
