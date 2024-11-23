import { BaseEntity } from "src/common/database/baseEntity";
import { HomeworkEnum } from "src/common/enums/enum";
import { Course } from "src/modules/course/entities/course.entity";
import { Homework } from "src/modules/homework/entities/homework.entity";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";

@Entity("blocks")
export class Block extends BaseEntity {
  // Blokning sarlavhasi (maksimal uzunligi 255 ta belgi)
  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  // Blokning tartib raqami
  @Column({ type: "int", nullable: false })
  order: number;

  @Column({ type: "bigint", default: 0 })
  duration: number;

  @Column({ type: "bigint", name: "count_videos", default: 0 })
  countVideos: number;

  // Blokning kategoriyasi (enum: HomeworkEnum dan olinadi, majburiy)
  @Column({ type: "enum", enum: HomeworkEnum, nullable: false })
  category: HomeworkEnum;

  // Kurs bilan bog'liq ma'lumot (blok qaysi kursga tegishli ekanligini bildiradi)
  @ManyToOne(() => Course, (course) => course.blocks, {
    onDelete: "NO ACTION", // Kurs o'chirilganda hech qanday o'zgarish bo'lmaydi
  })
  @JoinColumn({ name: "course_id" })
  course: Course; // Kurs modeli bilan bog'lanadi

  // Blokdagi uy vazifalari (Homeworks)
  @OneToMany(() => Homework, (homework) => homework.block)
  homeworks: Homework[];

  // Blokdagi darslar (Lessons)
  @OneToMany(() => Lesson, (lesson) => lesson.block, { onDelete: "NO ACTION" })
  lessons: Lesson[]; // Darslar modeli bilan bog'lanadi
}
