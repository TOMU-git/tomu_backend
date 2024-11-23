import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Homework } from "src/modules/homework/entities/homework.entity";

@Entity("homework_progress")
@Unique(["userId", "courseId", "blockId", "homeworkOrder"])
export class HomeworkProgress extends BaseEntity {
  /**
   * Blokning tartib raqami.
   * Ushbu maydon, darsning qaysi blokda ekanligini ifodalaydi.
   */
  @Column({ type: "int", name: "block_order", nullable: false })
  blockOrder: Number;

  /**
   * homework tartib raqami.
   * Ushbu maydon, homeworknig tartib raqamini ifodalaydi.
   */
  @Column({ type: "int", name: "homework_order", nullable: false })
  homeworkOrder: Number;

  /**
   * User id si.
   * Ushbu maydon, User videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "user_idx", nullable: false })
  userId: Number;

  /**
   * block id si.
   * Ushbu maydon, block videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "block_id", nullable: false })
  blockId: Number;

    /**
   * block id si.
   * Ushbu maydon, block videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
    @Column({ type: "int", name: "course_id", nullable: false })
    courseId: Number;

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

  // Foydalanuvchiga tegishli homework_progress yozuvi
  @ManyToOne(() => User, (user) => user.homeworkProgresses)
  @JoinColumn({ name: "user_id" })
  user: User;

  // Ushbu homework uchun progress yozuvi
  @ManyToOne(() => Homework, (homework) => homework.homeworkProgresses)
  @JoinColumn({ name: "homework_id" })
  homework: Homework;
}
