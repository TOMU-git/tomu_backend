import { BaseEntity } from "src/common/database/baseEntity";
import { GenderEnum } from "src/common/enums/enum";
import { Column, Entity } from "typeorm";

@Entity("user_livechats")
export class UserLivechatEntity extends BaseEntity {
  @Column({ name: "user_id", type: "int", nullable: false })
  userId: number;

  @Column({ name: "live_chat_id", type: "int", nullable: false, unique: true })
  liveChatId: number;

  @Column({ name: "teacher_id", type: "int", nullable: false })
  teacherId: number;

  @Column({ name: "course_id", type: "varchar", nullable: false })
  courseId: number;

  @Column({ name: "first_name", type: "varchar", nullable: false })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", nullable: false })
  lastName: string;

  @Column({ name: "phone_number", type: "varchar", nullable: false })
  phoneNumber: string;

  @Column({ name: "gender", type: "enum", enum: GenderEnum, nullable: false })
  gender: GenderEnum;

  @Column({ name: "price", type: "bigint", nullable: false })
  price: number;

  @Column({ name: "selected_course_name", type: "varchar", nullable: false })
  selectedCourseName: string;

  @Column({ name: "duration", type: "int", nullable: false })
  duration: number;

  @Column({ name: "is_accepted", type: "boolean", nullable: false })
  isAccepted: boolean;

  @Column({ name: "selected_day", type: "date", nullable: false })
  selectedDay: Date;

  @Column({ name: "selected_time", type: "varchar", nullable: false })
  selectedTime: string;

  @Column({ name: "meeting_url", type: "varchar", nullable: false })
  meetingUrl: string;
}
