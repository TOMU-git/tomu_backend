import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { HomeworkProgress } from 'src/modules/homework-progress/entities/homework-progress.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('homeworks')
export class Homework extends BaseEntity {
  /**
   * Homework video URL manzili.
   * Ushbu maydon homework uchun qo'shilgan video manzilini saqlaydi.
   */
  @Column({ type: 'varchar', length: 255, name: 'video_url' })
  videoUrl: string;

  /**
   * Homework uchun batafsil tavsif.
   * Ushbu maydon homework haqida tushuncha beradi va o'quvchilar uchun
   * vazifalarni yoki yo'riqnomalarni taqdim etadi.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4', 'video/x-ms-wmv' va hokazo.
   * Bu maydon dars bilan bog'liq faylning turini aniqlashga yordam beradi.
  */
  @Column({ type: 'varchar', length: 50, name: 'mime_type' })
  mimetype: string;

  /**
   * Faylning o'lchamini baytlarda ko'rsatadi.
   * Bu maydon yuklangan faylning hajmini nazorat qilish va foydalanuvchiga ma'lumot berish imkonini beradi.
  */
  @Column({ type: 'int' })
  size: number;

  /**
   * Homework tartibini belgilaydi.
   * Bu maydon homework'larni ketma-ketlikda tartib bilan ko'rsatishga yordam beradi.
   * O'quvchilar homework'larni belgilangan tartibda bajarishlari kerak bo'ladi.
   */
  @Column({ type: 'int' })
  order: number;

  /**
   * Homework davomiyligi (soniyada).
   * Ushbu maydon homeworkning davomiyligini soniyalar bilan o'lchaydi.
   */
  @Column({ type: 'int' })
  duration: number;

  /**
   * Homework qaysi blokga tegishli ekanligini belgilaydi.
   * Blok va homework orasidagi munosabatni ifodalaydi.
   * Har bir homework ma'lum bir blokka tegishli bo'ladi.
   */
  @ManyToOne(() => Block, (block) => block.homeworks)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  /**
   * Homeworkning o'zlashtirilishi (progressi) ro'yxati.
   * Homework va HomeworkProgress o'rtasidagi munosabatni ifodalaydi.
   */
  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.homework,
  )
  homeworkProgresses: HomeworkProgress[];
}
