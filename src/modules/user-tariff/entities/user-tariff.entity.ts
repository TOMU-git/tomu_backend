import { BaseEntity } from "src/common/database/baseEntity";
import { Tariff } from "src/modules/tariff/entities/tariff.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("user_tariffs")
export class UserTariff extends BaseEntity {
  @Column({
    name: "purchase_date",
    type: "date",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  purchaseDate: Date;

  @Column({ name: "expiration_date", type: "date", nullable: false })
  expirationDate: Date;

  @ManyToOne(() => User, (user) => user.userTariffs)
  @JoinColumn({ name: "user_id" })
  user: User;

<<<<<<< HEAD
  @Column({ name: "user_id", type: "int", nullable: false })
  userId: number;

=======
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  @ManyToOne(() => Tariff, (tariff) => tariff.userTariffs)
  @JoinColumn({ name: "tariff_id" })
  tariff: Tariff;
<<<<<<< HEAD

  @Column({ name: "tariff_id", type: "int", nullable: false })
  tariffId: number;
=======
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
}
