import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('lesson_progress')
export class LessonProgress extends BaseEntity {
  @ManyToOne(() => User, (user) => user.lessonProgresses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Lesson, (lesson) => lesson.lessonProgresses)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'boolean', default: false })
  isWatched: boolean;
}
