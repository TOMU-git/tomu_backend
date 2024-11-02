import { BaseEntity } from "src/common/database/baseEntity";
import { StatusEnum } from "src/common/enums/enum";
import { Course } from "src/modules/course/entities/course.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("user_courses")
export class UserCourse extends BaseEntity {
  @Column({ type: "enum", enum: StatusEnum, nullable: false })
  status: StatusEnum;

  // Foydalanuvchi bilan bog'lanish
  @Column({ name: 'user_id', type: "integer", nullable: false })
  userId: number;

  // Kurs bilan bog'lanish
  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: "course_id" })
  course: Course;
}
