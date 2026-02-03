import { BaseEntity } from "src/common/database/baseEntity";
import { StatusEnum } from "src/common/enums/enum";
import { Course } from "src/modules/course/entities/course.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("user_courses")
export class UserCourse extends BaseEntity {
  @Column({ type: "enum", enum: StatusEnum, nullable: true, default: StatusEnum.PANDING })
  status: StatusEnum;

  @ManyToOne(() => User, (user) => user.userCourses)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "on_free_trial", type: "bool", default: false })
  onFreeTrial: boolean;

  @Column({ type: "bool", name: "is_active", default: false })
  isActive: boolean;

  @Column({ name: 'has_ever_paid', type: 'bool', default: false })
  hasEverPaid: boolean;

  @Column({ name: "tariff_id", type: 'int', nullable: true })
  tariffId: number;

  @Column({
    name: "started_at",
    type: "date",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  startedAt: Date;

  @Column({ name: "ended_at", type: "date", nullable: true })
  endedAt: Date;

  @Column({ name: "last_module_warning_shown_at", type: "timestamp", nullable: true })
  lastModuleWarningShownAt: Date | null;

  @Column({ name: "last_module_warning_block_order", type: "int", nullable: true })
  lastModuleWarningBlockOrder: number | null;

  @ManyToOne(() => Course, (course) => course.userCourses)
  @JoinColumn({ name: "course_id" })
  course: Course;
}
