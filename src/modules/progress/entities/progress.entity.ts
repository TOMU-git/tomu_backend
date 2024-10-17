import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Homework } from 'src/modules/homework/entities/homework.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('progress')
export class Progress extends BaseEntity {
  @ManyToOne(() => User, (user) => user.videoProgresses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Lesson, { nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @ManyToOne(() => Homework, { nullable: true })
  @JoinColumn({ name: 'homework_id' })
  homework: Homework;

  @Column({ type: 'boolean', default: false })
  /**
   * Foydalanuvchi videoni ko'rganligini belgilaydi.
   * `true` bo'lsa, foydalanuvchi ushbu videoni ko'rgan.
   * `false` bo'lsa, hali ko'rmagan.
   */
  isWatched: boolean;
}
