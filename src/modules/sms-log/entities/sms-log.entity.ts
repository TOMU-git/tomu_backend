import { Column, Entity } from "typeorm";
import { BaseEntity } from "src/common/database/baseEntity";

@Entity("sms_logs")
export class SmsLog extends BaseEntity {
  @Column({ name: "phone", length: 20 })
  phone: string;

  @Column({ name: "type", length: 30 })
  type: string; // 'otp' | 'forgot-password'

  @Column({ name: "status", length: 20 })
  status: string; // 'sent' | 'failed' | 'auth-error'

  @Column({ name: "eskiz_message_id", nullable: true, length: 100 })
  eskizMessageId: string;

  @Column({ name: "error_message", nullable: true, type: "text" })
  errorMessage: string;

  @Column({ name: "is_local", default: true })
  isLocal: boolean;
}
