import { BaseEntity } from 'src/common/database/baseEntity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity'; // Foydalanuvchilar
import { Course } from 'src/modules/course/entities/course.entity'; // Kurslar

@Entity('feedback')
export class Feedback extends BaseEntity {
  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'int' })
  rating: number; // 1 dan 5 gacha bo'lgan reyting

  @ManyToOne(() => User, (user) => user.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, (course) => course.feedbacks, {
    onDelete: 'NO ACTION', // Kurs o'chirilganda hech narsa bo'lmaydi
  })
  @JoinColumn({ name: 'course_id' })
  course: Course; // Kurs bilan bog'liq
}
