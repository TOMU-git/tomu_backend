// src/modules/homework-progress/entities/homework-watch-record.entity.ts
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "src/modules/user/entities/user.entity";
import { Homework } from "src/modules/homework/entities/homework.entity";
import { BaseEntity } from "src/common/database/baseEntity";

@Entity("homework_watch_records")
export class HomeworkWatchRecord extends BaseEntity {
  @Column({ type: "int", name: "user_id", nullable: false })
  userId: number;

  @Column({ type: "int", name: "homework_id", nullable: false })
  homeworkId: number;

  @Column({ type: "int", name: "module_id", nullable: false })
  moduleId: number;

  @Column({ type: "int", name: "watch_count", default: 0 })
  watchCount: number;

  @Column({ type: "int", name: "lesson_id", nullable: false })
  lessonId: number;

  @Column({ type: "timestamp", name: "last_watched_at", nullable: true })
  lastWatchedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Homework)
  @JoinColumn({ name: "homework_id" })
  homework: Homework;
}