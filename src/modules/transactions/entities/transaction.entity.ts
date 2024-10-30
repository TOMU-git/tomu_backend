import { TransactionStateEnum } from "src/common/enums/transaction";
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("transactions")
export class TransactionEntity {
  @PrimaryColumn({ type: "varchar", nullable: false })
  id: string;

  @Column({ name: "user_id", type: "integer", nullable: false })
  userId: number;

  @Column({ name: "course_id", type: "integer", nullable: false })
  courseId: number;

  @Column({
    name: "state",
    type: "enum",
    enum: TransactionStateEnum,
    nullable: false,
  })
  state: TransactionStateEnum;

  @Column({
    name: "amount",
    type: "numeric",
    nullable: false,
  })
  amount: number;

  @Column({ name: "create_time", type: "bigint", default: Date.now() })
  createTime: number = Date.now();

  @Column({ name: "perform_time", type: "bigint", default: 0 })
  performTime: number;

  @Column({ name: "cancel_time", type: "bigint", default: 0 })
  cancelTime: number;

  @Column({ name: "reason", type: "numeric", default: null })
  reason: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    nullable: false,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "last_update_at",
    type: "timestamp",
    nullable: false,
  })
  lastUpdatedAt: Date;
}
