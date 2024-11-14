import { GenderEnum, MeetingStatusEnum } from "src/common/enums/enum";
import { BaseEntity } from "../../../common/database/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("live_chat")
export class LiveChatEntity extends BaseEntity {
  @Column({ name: "first_name", type: "varchar", nullable: false })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", nullable: false })
  lastName: string;

  @Column({ name: "gender", type: 'enum', enum: GenderEnum,  nullable: false })
  gender: GenderEnum;

  @Column({ name: "phone_number", type: "varchar", nullable: false })
  phoneNumber: string;

  @Column({ name: 'duration', type: 'int',  nullable: false })
  duration: number;

  @Column({ name: 'price', type: 'bigint', nullable: false })
  price: number;

  @Column({ name: "user_id", type: "int", nullable: false })
  userId: number;

  @Column({ name: "selected_course_id", type: "int", nullable: false })
  selectedCourseId: number;

  @Column({ name: 'selected_course_name', type: 'varchar', nullable: false })
  selectedCourseName: string;

  @Column({ name: 'is_accepted', type: 'boolean', nullable: false })
  isAccepted: boolean;

  @Column({ name: "selected_day", type: "date", nullable: false })
  selectedDay: Date;

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
