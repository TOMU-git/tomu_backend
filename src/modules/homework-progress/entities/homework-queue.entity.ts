// src/modules/homework-progress/entities/homework-queue.entity.ts
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Homework } from "src/modules/homework/entities/homework.entity";

@Entity("homework_queue")
export class HomeworkQueue extends BaseEntity {
  @Column({ type: "int", name: "user_id", nullable: false })
  userId: number;

  @Column({ type: "int", name: "homework_id", nullable: false })
  homeworkId: number;

  @Column({ type: "int", name: "course_id", nullable: false })
  courseId: number;

  @Column({ type: "int", name: "priority", default: 0 })
  priority: number;
  
  @Column({ type: "int", name: "homework_order", default: 0 })
  homeworkOrder: number;

  @Column({ type: "int", name: "block_order", default: 0 })
  blockOrder: number;

  @Column({ type: "boolean", name: "is_scheduled", default: false })
  isScheduled: boolean;

  @Column({ type: "timestamp", name: "scheduled_at", nullable: true })
  scheduledAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Homework, { eager: true })
  @JoinColumn({ name: "homework_id" })
  homework: Homework;
}