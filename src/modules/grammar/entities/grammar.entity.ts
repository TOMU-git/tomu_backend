import { BaseEntity } from 'src/common/database/baseEntity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('grammars')
export class Grammar extends BaseEntity {
  @Column({ type: 'text', name: 'title' })
  title: string;

  @Column({ type: 'text', name: 'grammar_text' })
  grammarText: string;

  @OneToOne(() => Lesson, (lesson) => lesson.grammar)
  @JoinColumn({name: 'course_id'})
  courseId: Lesson;
}
