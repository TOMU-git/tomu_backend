import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, JoinColumn, OneToOne } from 'typeorm';

export class Grammar {
  @Column({ type: 'text' })
  grammar_text: string;

  @OneToOne(() => Lesson, (lesson) => lesson.grammar)
  @JoinColumn()
  lesson: Lesson;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
