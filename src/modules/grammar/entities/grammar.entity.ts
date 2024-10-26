import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";

@Entity("grammars")
export class Grammar extends BaseEntity {
  @Column({ type: "text" })
  title: string;

  @Column({ type: "text", name: "grammar_text" })
  grammarText: string;

  @Column({ name: "course_id", type: "int", nullable: false }) // Qo'shiladigan ustun
  courseId: number;
}
