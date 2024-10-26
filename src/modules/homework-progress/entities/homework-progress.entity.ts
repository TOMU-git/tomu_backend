import { BaseEntity } from 'src/common/database/baseEntity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Homework } from 'src/modules/homework/entities/homework.entity';

@Entity('homework_progress')
export class HomeworkProgress extends BaseEntity {
  @ManyToOne(() => User, (user) => user.homeworkProgresses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Homework, (homework) => homework.homeworkProgresses)
  @JoinColumn({ name: 'homework_id' })
  homework: Homework;

  @Column({ type: 'boolean', default: false })
  isWatched: boolean;
}
