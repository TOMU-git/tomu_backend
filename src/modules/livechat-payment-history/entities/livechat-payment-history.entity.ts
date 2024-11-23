import { BaseEntity } from "src/common/database/baseEntity";
import { GenderEnum } from "src/common/enums/enum";
import { Column, Entity } from "typeorm";

@Entity("livechat_payment")
export class LivechatPaymentHistoryEntity extends BaseEntity {
  @Column({ name: "full_name", type: "varchar", nullable: false })
  fullName: string;

  @Column({ name: "course_name", type: "varchar", nullable: false })
  courseName: string;

  @Column({ name: "payment", type: "bigint", nullable: false })
  paymentAmount: number;

  @Column({ name: 'user_phone_number', type: 'varchar', nullable: false })
  userPhoneNumber: string;

  @Column({ name: 'duration', type: 'int',  nullable: false })
  duration: number;

  @Column({ name: "selected_day", type: "date", nullable: false })
  selectedDay: Date;

  @Column({ name: "selected_time", type: "varchar", nullable: false })
  selectedTime: string;

  @Column({ name: "gender", type: "enum", enum: GenderEnum, nullable: false })
  gender: GenderEnum;

  @Column({ name: "livechat_id", type: "int", nullable: false })
  liveChatId: number;
}
