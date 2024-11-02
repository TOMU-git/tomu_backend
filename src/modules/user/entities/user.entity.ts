import { IsPhoneNumber } from "class-validator";
import { BaseEntity } from "src/common/database/baseEntity";
import { GenderEnum, RoleEnum } from "src/common/enums/enum";
import { Feedback } from "src/modules/feedback/entities/feedback.entity";
import { HomeworkProgress } from "src/modules/homework-progress/entities/homework-progress.entity";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { UserCourse } from "src/modules/user-courses/entities/user-course.entity";
import { UserTariff } from "src/modules/user-tariff/entities/user-tariff.entity";
import { Entity, Column, OneToMany } from "typeorm";

@Entity("users")
export class User extends BaseEntity {
  @Column({ name: "first_name", type: "varchar", length: 256, nullable: false })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 256, nullable: false })
  lastName: string;

  @Column({ name: "phone_number", type: "varchar", length: 15, nullable: true })
  @IsPhoneNumber(null)
  phoneNumber: string;

  @Column({ type: "enum", enum: GenderEnum, nullable: false })
  gender: GenderEnum;

  @Column({ type: "text", nullable: false })
  password: string;

  @Column({ type: "enum", enum: RoleEnum, nullable: false })
  role: RoleEnum;

  @Column({ name: "hashed_refresh_token", type: "varchar", nullable: true })
  hashed_refresh_token: string;

  // Foydalanuvchi tariflari
  @OneToMany(() => UserTariff, (userTariff) => userTariff.user, {
    onDelete: "SET NULL",
  })
  userTariffs: UserTariff[];

  // Foydalanuvchi bergan feedbacklar
  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.user)
  lessonProgresses: LessonProgress[];

  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.user,
  )
  homeworkProgresses: HomeworkProgress[];

  @OneToMany(
    () => UserCourse,
    (userCourse) => userCourse.user,
  )
  userCourses: HomeworkProgress[];
}
