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

=======
  
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
  // Kurs bilan bog'lanish
  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: "course_id" })
  course: Course;
}
