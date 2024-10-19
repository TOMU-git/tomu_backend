import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { LessonProgress } from 'src/modules/lesson-progress/entities/lesson-progress.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

@Entity('lessons') // Entity nomini belgilash
export class Lesson extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  video_url: string;

  @Column({ type: 'int' })
  /**
   * Darsning tartibini belgilaydi.
   * Bu maydon yordamida darslar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar darslarni belgilangan tartibda o'qishi mumkin.
   * Misol uchun, agar darslar 1, 2, 3 ko'rinishida belgilangan bo'lsa,
   * foydalanuvchilar 1-darsdan 2-darsga, keyin esa 3-darsga o'tishlari mumkin.
   */
  order: number;

  @Column({ type: 'varchar', length: 50, name: 'mime_type' })
  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4', 'video/x-ms-wmv' va hokazo.
   * Bu maydon dars bilan bog'liq faylning turini aniqlashga yordam beradi.
   */
  mimetype: string;

  @Column({ type: 'int' })
  /**
   * Faylning o'lchamini baytlarda ko'rsatadi.
   * Bu maydon yuklangan faylning hajmini nazorat qilish va foydalanuvchiga ma'lumot berish imkonini beradi.
   */
  size: number;

  @ManyToOne(() => Block, (block) => block.lessons)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  @Column({ name: 'block_id', type: 'int', nullable: false })
  blockId: number;

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.lesson)
  lessonProgresses: LessonProgress[];
}
