import { BaseEntity } from "src/common/database/baseEntity";
import { Tariff } from "src/modules/tariff/entities/tariff.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("user_tariffs")
export class UserTariff extends BaseEntity {
  // Tariff sotib olingan sana; agar ko'rsatilmasa, hozirgi sana bilan avtomatik to'ldiriladi
  @Column({
    name: "started_at",
    type: "date",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  startedAt: Date;

  // Tariff muddati tugash sanasi; agar muddati cheklanmagan bo'lsa null bo'lishi mumkin
  @Column({ name: "ended_at", type: "date", nullable: false })
  endedAt: Date;

  // Tariff faol yoki faol emasligini ko'rsatadi; default qiymati true (faol)
  @Column({ type: "bool", name: "is_active", default: true })
  isActive: Boolean;

  // User entiteti bilan bog'lanish; ushbu tariffga ega bo'lgan foydalanuvchini ifodalaydi
  @ManyToOne(() => User, (user) => user.userTariffs)
  @JoinColumn({ name: "user_id" })
  user: User;

  // Tariff entiteti bilan bog'lanish; foydalanuvchiga tegishli bo'lgan aniq tariffni ifodalaydi
  @ManyToOne(() => Tariff, (tariff) => tariff.userTariffs)
  @JoinColumn({ name: "tariff_id" })
  tariff: Tariff;
}
