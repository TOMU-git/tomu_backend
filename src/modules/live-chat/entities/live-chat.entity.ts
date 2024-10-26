import { GenderEnum, MeetingStatusEnum } from "src/common/enums/enum";
import { BaseEntity } from "../../../common/database/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("live_chat")
export class LiveChatEntity extends BaseEntity {
  @Column({ name: "fullname", type: "varchar", nullable: false })
  fullname: string;

  @Column({ name: "gender", type: "varchar", nullable: false })
  gender: string;

  @Column({ name: "phone_number", type: "varchar", nullable: false })
  phoneNumber: string;

  @Column({ name: "course_purchased", type: "varchar", nullable: false })
  coursePurchased: string;

  @Column({ name: "selected_meeting_course", type: "varchar", nullable: false })
  selectedMeetingCourse: string;

  @Column({ name: "selected_day", type: "varchar", nullable: false })
  selectedDay: string;

  @Column({ name: "selected_time", type: "varchar", nullable: false })
  selectedTime: string;

  @Column({
    name: "status",
    type: "enum",
    enum: MeetingStatusEnum,
    nullable: false,
  })
  status: MeetingStatusEnum;
}
