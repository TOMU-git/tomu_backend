import { BaseEntity } from "src/common/database/baseEntity";
import { StatusEnum } from "src/common/enums/enum";
import { Course } from "src/modules/course/entities/course.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("user_courses")
export class UserCourse extends BaseEntity {
  @Column({ name: "purchase_date", type: "date", nullable: false })
  purchaseDate: Date;

  @Column({ type: "enum", enum: StatusEnum, nullable: false })
  status: StatusEnum;

  // Foydalanuvchi bilan bog'lanish
  @ManyToOne(() => User, (user) => user.userCourses)
  @JoinColumn({ name: "user_id" })
  user: User;

<<<<<<< HEAD
  @Column({ name: "user_id", type: "int", nullable: false })
  userId: number;

=======
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  // Kurs bilan bog'lanish
  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: "course_id" })
  course: Course;
<<<<<<< HEAD

  @Column({ name: "course_id", type: "int", nullable: false })
  courseId: number;
=======
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
}
