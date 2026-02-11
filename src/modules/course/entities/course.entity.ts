import { BaseEntity } from "src/common/database/baseEntity";
import { Block } from "src/modules/block/entities/block.entity";
import { Feedback } from "src/modules/feedback/entities/feedback.entity";
import { UserCourse } from "src/modules/user-courses/entities/user-course.entity";
import { Tariff } from "src/modules/tariff/entities/tariff.entity"; // Tariffni import qilish
import { Column, Entity, OneToMany } from "typeorm";
import { Alphabet } from "src/modules/alphabet/entities/alphabet.entity";
import { Lesson } from "src/modules/lesson/entities/lesson.entity";
import { Group } from "src/modules/group/entities/group.entity";

@Entity("courses")
export class Course extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" }) // Kurs rasmi URL
  imageUrl: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "video_url" }) // Kurs videosi URL
  videoUrl: string;

  @Column({ type: "varchar", length: 50, nullable: true, name: "vimeo_video_id" }) // Vimeo video ID
  vimeoVideoId: string;

  @Column({ type: "varchar", length: 50, nullable: true, name: "mime_type" }) // Fayl turi (mimetype)
  mimetype: string;

  @Column({ type: "int", nullable: true }) // Fayl hajmi baytlarda
  size: number;

  @Column({ type: "bool", nullable: true, default: true })
  isActive: boolean;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
    name: "lang",
    default: null
  })
  lang: string; // "ar", "eng", "ru" - kursning qaysi tilda mavjudligi

  // Foydalanuvchi o'qigan kurslar bilan bog'lanish
  @OneToMany(() => UserCourse, (userCourse) => userCourse.course, {
    onDelete: "NO ACTION", // Kurs o'chirilganda bog'langan o'qishlar o'chirilmaydi
    nullable: true, // O'qilgan kurslar bo'sh qoldirilishi mumkin
  })
  userCourses: UserCourse[];

  // Feedbacklar bilan bog'lanish
  @OneToMany(() => Feedback, (feedback) => feedback.course, {
    onDelete: "NO ACTION", // Kurs o'chirilganda bog'langan feedbacklar o'chirilmaydi
    onUpdate: "NO ACTION", // Kurs yangilanganda bog'langan feedbacklar yangilanmaydi
    nullable: true, // Feedbacklar bo'sh qoldirilishi mumkin
  })
  feedbacks: Feedback[];

  // Blocklar bilan bog'lanish
  @OneToMany(() => Block, (block) => block.course, {
    onDelete: "SET NULL",
    nullable: true,
  })
  blocks: Array<Block>;

  // Blocklar bilan bog'lanish
  @OneToMany(() => Lesson, (lesson) => lesson.course, {
    onDelete: "SET NULL",
    nullable: true,
  })
  lessons: Array<Block>;

  // Alifbolar bilan bog'lanish
  @OneToMany(() => Alphabet, (alphabet) => alphabet.course, {
    onDelete: "NO ACTION", // Kurs o'chirilganda bog'langan alifbolar o'chirilmaydi
    nullable: true, // Alifbolar bo'sh qoldirilishi mumkin
  })
  alphabets: Alphabet[];

  // Guruhlar bilan bog'lanish
  @OneToMany(() => Group, (group) => group.course, {
    onDelete: "SET NULL",
    nullable: true,
  })
  groups: Group[];
}
