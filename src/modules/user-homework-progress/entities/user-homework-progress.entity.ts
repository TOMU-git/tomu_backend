import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Homework } from "src/modules/homework/entities/homework.entity";

@Entity("user_homework_progress")
export class UserHomeworkProgress extends BaseEntity {
  /**
   * Blokning tartib raqami.
   * Ushbu maydon, darsning qaysi blokda ekanligini ifodalaydi.
   */
  @Column({ type: "int", name: "block_order", nullable: false })
  blockOrder: number;

  /**
   * homework tartib raqami.
   * Ushbu maydon, homeworknig tartib raqamini ifodalaydi.
   */
  @Column({ type: "int", name: "homework_order", nullable: false })
  homeworkOrder: number;

  /**
   * User id si.
   * Ushbu maydon, User videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "user_id", nullable: false })
  userId: number;

  /**
   * block id si.
   * Ushbu maydon, block videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "block_id", nullable: false })
  blockId: number;

  /**
   * course id si.
   * Ushbu maydon, course videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "course_id", nullable: false })
  courseId: number;

  // Homework ko'rilganligini bildiruvchi ustun (true - ko'rilgan, false - ko'rilmagan)
  @Column({
    type: "boolean",
    default: true,
    name: "is_watched",
    nullable: false,
  })
  isWatched: boolean;

  // Homework qancha marta ko'rilganligini hisoblaydigan ustun (0 dan 5 gacha qiymatlarni olishi mumkin)
  @Column({ type: "int", name: "count_watched", default: 0 })
  countWatched: number;

  // Ushbu homework uchun progress yozuvi
  @ManyToOne(() => Homework, (homework) => homework.homeworkProgresses)
  @JoinColumn({ name: "homework_id" })
  homework: Homework;
}
