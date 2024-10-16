import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { Feedback } from 'src/modules/feedback/entities/feedback.entity';
import { Tariff } from 'src/modules/tariff/entities/tariff.entity';
import { UserCourse } from 'src/modules/user-courses/entities/user-course.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, OneToMany, ManyToOne } from 'typeorm';

@Entity('courses')
export class Course extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'image_url' })
  imageUrl: string;

  // O'qituvchi User entitisi orqali bog'lanadi
  @ManyToOne(() => User, (user) => user.courses, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  instructor: User;

  // Foydalanuvchi o'qigan kurslar bilan bog'lanish
  @OneToMany(() => UserCourse, (userCourse) => userCourse.course, {
    onDelete: 'NO ACTION',
  })
  userCourses: UserCourse[];

  // Feedbacklar bilan bog'lanish
  @OneToMany(() => Feedback, (feedback) => feedback.course, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  feedbacks: Feedback[];

  // Blocklar bilan bog'lanish
  @OneToMany(() => Block, (block) => block.course, {
    onDelete: 'SET NULL', // Course o'chirilganda, block kurs qiymati null bo'ladi
    nullable: true,
  })
  blocks: Block[];

  // Tariflar bilan bog'lanish
  @OneToMany(() => Tariff, (tariff) => tariff.course, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  tariffs: Tariff[];
}
