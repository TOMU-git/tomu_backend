import { BaseEntity } from "src/common/database/baseEntity";
import { HomeworkEnum } from "src/common/enums/enum";
import { Course } from "src/modules/course/entities/course.entity";
import { Homework } from "src/modules/homework/entities/homework.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

@Entity("blocks")
export class Block extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "enum", enum: HomeworkEnum, nullable: false})
  category: HomeworkEnum;

  @Column({ name: 'course_id', type: 'integer', nullable: false })
  courseId: number;

  @OneToMany(() => Homework, (homework) => homework.block)
  homeworks: Homework[];

  @OneToMany(() => Lesson, (lesson) => lesson.block, { onDelete: "NO ACTION" })
  lessons: Lesson[];
}
