import { IsPhoneNumber } from "class-validator";
import { BaseEntity } from "src/common/database/baseEntity";
import { AuthProviderEnum, GenderEnum, RoleEnum } from "src/common/enums/enum";
import { Feedback } from "src/modules/feedback/entities/feedback.entity";
import { HomeworkProgress } from "src/modules/homework-progress/entities/homework-progress.entity";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { UserCourse } from "src/modules/user-courses/entities/user-course.entity";
import { UserDevice } from "src/modules/user-device/entities/user-device.entity";
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Group } from "src/modules/group/entities/group.entity";
import { Lecture } from "src/modules/lecture/entities/lecture.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ name: "first_name", type: "varchar", length: 256, nullable: false })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 256, nullable: false })
  lastName: string;

  @Column({ name: "phone_number", type: "varchar", length: 15, nullable: true })
  @IsPhoneNumber(null)
  phoneNumber: string;

  @Column({ type: "enum", enum: GenderEnum, nullable: true })
  gender: GenderEnum;

  @Column({ type: "text", nullable: true })
  password: string;

  @Column({ type: "text", name: 'unhashed_password', nullable: true })
  unhashedPassword: string;

  @Column({ type: "enum", enum: RoleEnum, nullable: false })
  role: RoleEnum;

  @Column({ name: 'course_id', type: 'int', nullable: true, default: null })
  courseId: number;

  @Column({ name: "hashed_refresh_token", type: "varchar", nullable: true })
  hashed_refresh_token: string;

  /**
   * Maximum number of devices allowed for this user
   * Default values based on role:
   * - STUDENT: 2 devices
   * - TEACHER: 3 devices  
   * - ADMIN: 5 devices
   * - DIRECTOR: 10 devices
   */
  @Column({
    name: 'max_devices',
    type: 'int',
    default: 3,
    comment: 'Maximum number of devices allowed for this user'
  })
  maxDevices: number;

  /**
   * Device management enabled flag
   * When false, device limits are not enforced
   * Allows gradual rollout of device management
   */
  @Column({
    name: 'device_management_enabled',
    type: 'boolean',
    default: false,
    comment: 'Whether device management is enabled for this user'
  })
  deviceManagementEnabled: boolean;

  /**
   * OAuth Provider Information
   * These fields support Google and Apple authentication
   */

  @Column({
    name: 'google_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: 'Google OAuth user ID'
  })
  googleId: string;

  @Column({
    name: 'apple_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: 'Apple OAuth user ID'
  })
  appleId: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'User email address from OAuth or manual entry'
  })
  email: string;

  @Column({
    name: 'avatar',
    type: 'text',
    nullable: true,
    comment: 'User avatar URL from OAuth provider'
  })
  avatar: string;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProviderEnum,
    default: AuthProviderEnum.LOCAL,
    comment: 'Authentication provider: local, google, or apple'
  })
  authProvider: AuthProviderEnum;

  @Column({
    name: 'email_verified',
    type: 'boolean',
    default: false,
    comment: 'Whether email has been verified'
  })
  emailVerified: boolean;

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

  @OneToMany(() => UserCourse, (userCourse) => userCourse.user)
  userCourses: UserCourse[];

  /**
   * User devices relationship
   * One user can have multiple devices
   */
  @OneToMany(() => UserDevice, (device) => device.user, {
    cascade: false, // Don't auto-delete devices when user is deleted
    eager: false    // Don't load devices by default
  })
  devices: UserDevice[];


  @OneToMany(() => Lecture, (lecture) => lecture.user)
  lectures: Lecture[];


  @ManyToOne(() => Group, (group) => group.users, {
    nullable:true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: "group_id" })
  group: Group;
}
