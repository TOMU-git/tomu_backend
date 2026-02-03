import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";
import { Column, Entity, JoinColumn, ManyToOne, RelationId } from "typeorm";

@Entity("lesson_progress")
export class LessonProgress extends BaseEntity {
  /**
   * Blokning tartib raqami.
   * Ushbu maydon, darsning qaysi blokda ekanligini ifodalaydi.
   */
  @Column({ type: "int", name: "block_order", nullable: false })
  blockOrder: number;

  /**
   * Lesson tartib raqami.
   * Ushbu maydon, lessonnig tartib raqamini ifodalaydi.
   */
  @Column({ type: "int", name: "lesson_order", nullable: false })
  lessonOrder: number;

  // Scalar userId ustuni olib tashlandi - faqat relation ishlatiladi

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

  /**
   * Tomosha qilinganligini bildiruvchi holat.
   * Agar dars tomosha qilingan bo'lsa true, aks holda false qiymat saqlanadi.
   */
  @Column({ type: "boolean", default: false, name: "is_watched" })
  isWatched: boolean;

  /**
   * Darsning ochiq yoki yopiqligini bildiruvchi holat.
   * Agar dars ochiq bo'lsa true, aks holda false qiymat saqlanadi.
   */
  @Column({ type: "boolean", default: false, name: "is_unlocked" })
  isUnlocked: boolean;

  /**
   * Foydalanuvchi bilan bog'lanish.
   * Ushbu maydon lesson_progress va user orasidagi aloqani ta'minlaydi.
   */
  @ManyToOne(() => User, (user) => user.lessonProgresses)
  @JoinColumn({ name: "user_id" })
  user: User;

  // Scalar userId ni olish uchun @RelationId
  @RelationId((lp: LessonProgress) => lp.user)
  userId: number;

  /**
   * Dars bilan bog'lanish.
   * lesson_progress va lesson orasidagi aloqani ta'minlaydi.
   */
  @ManyToOne(() => Lesson, (lesson) => lesson.lessonProgresses)
  @JoinColumn({ name: "lesson_id" })
  lesson: Lesson;
}
/*
Lesson Progress O'zgarishlari Ro'yxati
🔧 Entity O'zgarishlari (lesson-progress.entity.ts):
1. O'chirilgan:
    @Column({ type: "int", name: "user_idx", nullable: false })
    userId: number;

2. Qo'shilgan:
    @RelationId((lp: LessonProgress) => lp.user)
    userId: number;

3. Import qo'shilgan:
      import { RelationId } from "typeorm";

🗄️ Repository O'zgarishlari (lesson-progress.repository.ts):
Barcha metodlarda userId: userId → user: { id: userId } ga o'zgartirildi:
findByBlockIdAndUserId() - where condition
findLastWatchedLessonOrder() - QueryBuilder da leftJoin qo'shildi
findMaxLessonOrder() - QueryBuilder da leftJoin qo'shildi
getLessonProgress() - where condition
unlockNextLesson() - where condition
findAllWatchedLessonsByUser() - where condition
checkAllLessonsWatched() - where condition
countWatchedLessonsInDateRange() - where condition
findLastUnlockedAndWatchedLessonOrder() - QueryBuilder da leftJoin qo'shildi


⚙️ Service O'zgarishlari (lesson-progress.service.ts):

1. Import qo'shilgan:
    import { User } from "../user/entities/user.entity";

2. generateLessonProgress() metodida:
   // Avvalgi:
   newProgress.userId = userId;
   
   // Hozirgi:
   newProgress.user = { id: userId } as User;

  🎯 Asosiy Maqsad:
user_idx va user_id nomlari birxillashtirildi
Faqat user_id FK ustuni qoldi
@RelationId orqali scalar userId avtomatik olinadi
Barcha querylar relation uslubida ishlaydi
🔄 Orqaga qaytarish uchun:
Entity da @RelationId ni o'chirib, @Column qaytarish
Repository metodlarida user: { id: userId } ni userId: userId ga o'zgartirish
Service da newProgress.user = { id: userId } ni newProgress.userId = userId ga o'zgartirish
*/