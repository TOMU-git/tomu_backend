import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { User } from "src/modules/user/entities/user.entity"; // Foydalanuvchilar
import { Course } from "src/modules/course/entities/course.entity"; // Kurslar

@Entity("feedback")
export class Feedback extends BaseEntity {
  @Column({ type: "text" })
  comment: string;

  @Column({ type: "int" })
  rating: number; // 1 dan 5 gacha bo'lgan reyting

  @ManyToOne(() => User, (user) => user.feedbacks, {
    onDelete: "CASCADE",
  })
  user: User;

  @Column({ name: "user_id", type: "int", nullable: false }) // Qo'shiladigan ustun
  userId: number; // Bu yerda `courseId` qo'shiladi

  @ManyToOne(() => Course, (course) => course.feedbacks, {
    onDelete: "CASCADE",
  })
  course: Course;

  @Column({ name: "course_id", type: "int", nullable: false }) // Qo'shiladigan ustun
  courseId: number; // Bu yerda `courseId` qo'shiladi
}
