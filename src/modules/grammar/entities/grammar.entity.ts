import { BaseEntity } from "src/common/database/baseEntity";
import {
  Column,
  Entity
} from "typeorm";

@Entity("grammars")
export class Grammar extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "int", nullable: true })
  /**
   * Grammarning tartibini belgilaydi.
   * Bu maydon yordamida grammarlar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar grammarlarni belgilangan tartibda o'qishi mumkin.
   */
  order: number;

  @Column({ type: "varchar", length: 255, name: "video_url" })
  videoUrl: string;

  @Column({ type: "varchar", length: 50, name: "vimeo_video_id", nullable: true })
  vimeoVideoId: string;


  @Column({ type: "varchar", length: 50, name: "mime_type" })
  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4', 'video/x-ms-wmv' va hokazo.
   * Bu maydon dars bilan bog'liq faylning turini aniqlashga yordam beradi.
   */
  mimetype: string;

  @Column({ type: "int" })
  /**
   * Faylning o'lchamini baytlarda ko'rsatadi.
   * Bu maydon yuklangan faylning hajmini nazorat qilish va foydalanuvchiga ma'lumot berish imkonini beradi.
   */
  size: number;

  @Column({ type: "int" })
  duration: number;

  @Column({ name: 'course_id', type: 'int', nullable: false })
  courseId: number;
}
