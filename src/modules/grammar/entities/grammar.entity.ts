import { BaseEntity } from 'src/common/database/baseEntity';
import { Course } from 'src/modules/course/entities/course.entity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';

@Entity('grammars')
export class Grammar extends BaseEntity {
  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', name: 'grammar_text' })
  grammarText: string;

  @ManyToOne(() => Course, (course) => course.grammars, {
    nullable: true, // course maydoni null bo'lishi mumkin
    onDelete: 'SET NULL', // Course o'chirilganda, course maydoni null ga o'rnatiladi
  })
  @JoinColumn() // JoinColumn yordamida bog'lanadi
  course: Course; // Course ga bog'langan grammatikalar

  @Column({ name: 'course_id', type: 'int', nullable: false }) // Qo'shiladigan ustun
  courseId: number; // Bu yerda `courseId` qo'shiladi
}
