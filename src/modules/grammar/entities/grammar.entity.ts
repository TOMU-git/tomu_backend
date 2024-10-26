import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from "typeorm";

@Entity("grammars")
export class Grammar extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, name: "video_url" })
  videoUrl: string;

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

  @ManyToOne(() => Course, (course) => course.grammars, {
    onDelete: "NO ACTION", // Kurs o'chirilganda hech narsa bo'lmaydi
  })
  @JoinColumn({ name: "course_id" })
  course: Course; // Kurs bilan bog'liq
}
