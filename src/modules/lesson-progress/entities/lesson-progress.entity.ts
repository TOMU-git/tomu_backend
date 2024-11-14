import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("lesson_progress")
export class LessonProgress extends BaseEntity {
  /**
   * Blokning tartib raqami.
   * Ushbu maydon, darsning qaysi blokda ekanligini ifodalaydi.
   */
  @Column({ type: "int", name: "block_order", nullable: true })
  blockOrder: Number;

  /**
   * Lesson tartib raqami.
   * Ushbu maydon, lessonnig tartib raqamini ifodalaydi.
   */
  @Column({ type: "int", name: "lesson_order", nullable: true })
  lessonOrder: Number;

  /**
   * User id si.
   * Ushbu maydon, User videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "user_idx", nullable: true })
  userId: Number;

  /**
   * block id si.
   * Ushbu maydon, block videolarini ko'rgan yoki ko'rmaganligini aniqlash uchun yordam beradi.
   */
  @Column({ type: "int", name: "block_id", nullable: true })
  blockId: Number;

  /**
   * Tomosha qilinganligini bildiruvchi holat.
   * Agar dars tomosha qilingan bo'lsa true, aks holda false qiymat saqlanadi.
   */
  @Column({ type: "boolean", default: false, name: "is_watched" })
  isWatched: boolean;

  /**
   * Foydalanuvchi bilan bog'lanish.
   * Ushbu maydon lesson_progress va user orasidagi aloqani ta'minlaydi.
   */
  @ManyToOne(() => User, (user) => user.lessonProgresses)
  @JoinColumn({ name: "user_id" })
  user: User;

  /**
   * Dars bilan bog'lanish.
   * lesson_progress va lesson orasidagi aloqani ta'minlaydi.
   */
  @ManyToOne(() => Lesson, (lesson) => lesson.lessonProgresses)
  @JoinColumn({ name: "lesson_id" })
  lesson: Lesson;
}
