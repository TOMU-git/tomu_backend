import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

/**
 * UserCourseProgress
 * -------------------------------------------------------
 * Maqsad:
 *  - Foydalanuvchining aniq bir kursdagi o‘qish jarayonini saqlaydi.
 *  - Hozir qaysi blok/darsda ekani, tugallangan darslar va kurs tili kabi
 *    ma’lumotlarni jamlaydi, AI uchun kontekst sifatida xizmat qiladi.
 *
 * Asosiy maydonlar:
 *  - userId, courseId: Kimning qaysi kurs bo‘yicha progressi saqlanayotgani.
 *  - courseLanguage: Shu kurs doirasidagi aloqa tili.
 *  - currentBlockId, currentLessonId, currentLessonOrder: Hozirgi holat.
 *  - completedLessons, completedBlocks: Tugallangan elementlar ro‘yxati.
 *  - isActive: Kurs hozir faolmi yoki yo‘q.
 *
 * Bog‘lanishlar:
 *  - ManyToOne(User): Har bir progress bitta foydalanuvchiga tegishli.
 *  - ManyToOne(Course): Har bir progress bitta kursga tegishli.
 */
@Entity("user_course_progress")
export class UserCourseProgress extends BaseEntity {
    // Foydalanuvchining ID si (kimning progressi saqlanayotganini bildiradi)
    @Column({ type: "int", name: "user_id", nullable: false })
    userId: number;

    // Qaysi kurs bo'yicha progress saqlanayotganini bildiradi
    @Column({ type: "int", name: "course_id", nullable: false })
    courseId: number;

    // Kurs tili (masalan: 'english', 'arabic', 'russian')
    @Column({ type: "varchar", length: 50, name: "course_language" })
    courseLanguage: string;

    // Hozirda ochiq bo'lgan blok ID si (ixtiyoriy)
    @Column({ type: "int", name: "current_block_id", nullable: true })
    currentBlockId: number;

    // Hozirda ochiq bo'lgan dars (lesson) ID si (ixtiyoriy)
    @Column({ type: "int", name: "current_lesson_id", nullable: true })
    currentLessonId: number;

    // Hozirgi darsning tartib raqami (1 dan boshlanadi)
    @Column({ type: "int", name: "current_lesson_order", default: 1 })
    currentLessonOrder: number;

    // Tugallangan darslar ro'yxati (lesson ID lar massiv ko'rinishida)
    @Column({ type: "json", name: "completed_lessons", default: [] })
    completedLessons: number[];

    // Tugallangan bloklar ro'yxati (block ID lar massiv ko'rinishida)
    @Column({ type: "json", name: "completed_blocks", default: [] })
    completedBlocks: number[];

    // Kurs bo'yicha progress aktivligini bildiradi (faol kurs)
    @Column({ type: "boolean", name: "is_active", default: true })
    isActive: boolean;

    // Foydalanuvchi bilan bog'lanish (User jadvali bilan foreign key)
    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    // Kurs bilan bog'lanish (Course jadvali bilan foreign key)
    @ManyToOne(() => Course, (course) => course.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "course_id" })
    course: Course;
}


