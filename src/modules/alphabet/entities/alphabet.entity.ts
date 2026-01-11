import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity("alphabets") // Entity nomini belgilash
export class Alphabet extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, name: "video_url" })
  videoUrl: string;

  @Column({ type: "varchar", length: 50, name: "vimeo_video_id", nullable: true })
  vimeoVideoId: string

  @Column({ type: "int", nullable: false })
  /**
   * Darsning tartibini belgilaydi.
   * Bu maydon yordamida darslar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar darslarni belgilangan tartibda o'qishi mumkin.
   * Misol uchun, agar darslar 1, 2, 3 ko'rinishida belgilangan bo'lsa,
   * foydalanuvchilar 1-darsdan 2-darsga, keyin esa 3-darsga o'tishlari mumkin.
   */
  order: number;

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

  @ManyToOne(() => Course, (course) => course.alphabets)
  @JoinColumn({ name: "course_id" })
  course: Course;
}
