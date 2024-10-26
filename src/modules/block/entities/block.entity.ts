import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import { Homework } from "src/modules/homework/entities/homework.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

@Entity("blocks")
export class Block extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @ManyToOne(() => Course, (course) => course.blocks, {
    onDelete: "NO ACTION", // Kurs o'chirilganda hech narsa bo'lmaydi
  })
  @JoinColumn({ name: "course_id" })
  course: Course; // Kurs bilan bog'liq

  @OneToMany(() => Homework, (homework) => homework.block)
  homeworks: Homework[];

  @OneToMany(() => Lesson, (lesson) => lesson.block, { onDelete: "NO ACTION" })
  lessons: Lesson[]; // Darslar bilan bog'liq
}
