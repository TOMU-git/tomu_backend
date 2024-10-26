import { BaseEntity } from "src/common/database/baseEntity";
import { Block } from "src/modules/block/entities/block.entity";
import { Feedback } from "src/modules/feedback/entities/feedback.entity";
import { Grammar } from "src/modules/grammar/entities/grammar.entity";
import { UserCourse } from "src/modules/user-courses/entities/user-course.entity";
import { Tariff } from "src/modules/tariff/entities/tariff.entity"; // Tariffni import qilish
import { Column, Entity, OneToMany } from "typeorm";
import { Alphabet } from "src/modules/alphabet/entities/alphabet.entity";

@Entity("courses")
export class Course extends BaseEntity {
<<<<<<< HEAD
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
=======
  @Column({ type: 'varchar', length: 255, nullable: true }) // Kurs nomi
  title: string;

  @Column({ type: 'text', nullable: true }) // Kurs tavsifi
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'image_url' }) // Kurs rasmi URL
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'video_url' }) // Kurs videosi URL
  videoUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'mime_type' }) // Fayl turi (mimetype)
  mimetype: string;

  @Column({ type: 'int', nullable: true }) // Fayl hajmi baytlarda
  size: number;

  @Column({ type: 'bool', nullable: true, default: true })
  isActive: boolean;

  // Foydalanuvchi o'qigan kurslar bilan bog'lanish
  @OneToMany(() => UserCourse, (userCourse) => userCourse.course, {
<<<<<<< HEAD
    onDelete: "NO ACTION",
=======
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan o'qishlar o'chirilmaydi
    nullable: true, // O'qilgan kurslar bo'sh qoldirilishi mumkin
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  })
  userCourses: UserCourse[];

  // Feedbacklar bilan bog'lanish
  @OneToMany(() => Feedback, (feedback) => feedback.course, {
<<<<<<< HEAD
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
=======
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan feedbacklar o'chirilmaydi
    onUpdate: 'NO ACTION', // Kurs yangilanganda bog'langan feedbacklar yangilanmaydi
    nullable: true, // Feedbacklar bo'sh qoldirilishi mumkin
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  })
  feedbacks: Feedback[];

  // Blocklar bilan bog'lanish
  @OneToMany(() => Block, (block) => block.course, {
<<<<<<< HEAD
    onDelete: "SET NULL",
    nullable: true,
  })
  blocks: Block[];

  @OneToMany(() => Alphabet, (alphabet) => alphabet.course, {
    onDelete: "NO ACTION",
=======
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan blocklar o'chirilmaydi
    nullable: true, // Blocklar bo'sh qoldirilishi mumkin
  })
  blocks: Block[];

  // Grammatikalar bilan bog'lanish
  @OneToMany(() => Grammar, (grammar) => grammar.course, {
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan grammatikalar o'chirilmaydi
    nullable: true, // Grammatikalar bo'sh qoldirilishi mumkin
  })
  grammars: Grammar[];

  // Alifbolar bilan bog'lanish
  @OneToMany(() => Alphabet, (alphabet) => alphabet.course, {
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan alifbolar o'chirilmaydi
    nullable: true, // Alifbolar bo'sh qoldirilishi mumkin
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  })
  alphabets: Alphabet[];

  // Tariflar bilan bog'lanish
  @OneToMany(() => Tariff, (tariff) => tariff.course, {
<<<<<<< HEAD
    onDelete: "CASCADE",
=======
    onDelete: 'NO ACTION', // Kurs o'chirilganda bog'langan tariflar o'chirilmaydi
    nullable: true, // Tariflar bo'sh qoldirilishi mumkin
>>>>>>> bd5057896ac18570b8a29aec1b48e2fd50c4b1b7
  })
  tariffs: Tariff[];
}
