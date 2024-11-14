import { BaseEntity } from "src/common/database/baseEntity";
import { Tariff } from "src/modules/tariff/entities/tariff.entity";
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

  @Column({ name: "user_id", type: 'int', nullable: false})
  userId: number;

  @Column({ name: "tariff_id", type: 'int', nullable: false })
  tariffId: number;
}
