import { BaseEntity } from "src/common/database/baseEntity";
import { Block } from "src/modules/block/entities/block.entity";
import { Course } from "src/modules/course/entities/course.entity";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, BeforeInsert, BeforeUpdate } from "typeorm";

@Entity("lessons") // Entity nomini belgilash
export class Lesson extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, name: "video_url" })
  videoUrl: string;

  @Column({ type: "int", nullable: false })

  /**
   * Darsning tartibini belgilaydi.
   * Bu maydon yordamida darslar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar darslarni belgilangan tartibda o'qishi mumkin.
   * Misol uchun, agar darslar 1, 2, 3 ko'rinishida belgilangan bo'lsa,
   * foydalanuvchilar 1-darsdan 2-darsga, keyin esa 3-darsga o'tishlari mumkin.
   */
  order: number;

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

  @Column({ type: "varchar", name: "grammar_link", nullable: true })
  grammarLink: string

  @Column({ type: "varchar", length: 50, name: "grammar_vimeo_id", nullable: true })
  grammarVideoId: string

  @Column({ type: "int" })
  duration: number;

  @ManyToOne(() => Block, (block) => block.lessons)
  @JoinColumn({ name: "block_id" })
  block: Block;

  @ManyToOne(() => Course, (course) => course.lessons)
  @JoinColumn({ name: "course_id" })
  course: Course;

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.lesson)
  lessonProgresses: LessonProgress[];

  /**
   * Lesson yaratilishidan oldin grammarLink dan grammarVideoId ni extract qiladi.
   */
  @BeforeInsert()
  extractGrammarVideoIdOnInsert() {
    console.log('🔵 BeforeInsert hook called');
    console.log('📝 grammarLink:', this.grammarLink);
    this.extractGrammarVideoId();
    console.log('✅ grammarVideoId extracted:', this.grammarVideoId);
  }

  /**
   * Lesson yangilanishidan oldin grammarLink dan grammarVideoId ni extract qiladi.
   */
  @BeforeUpdate()
  extractGrammarVideoIdOnUpdate() {
    console.log('🟡 BeforeUpdate hook called');
    console.log('📝 grammarLink:', this.grammarLink);
    this.extractGrammarVideoId();
    console.log('✅ grammarVideoId extracted:', this.grammarVideoId);
  }

  /**
   * grammarLink dan Vimeo video ID ni extract qilish logic.
   * Masalan: "https://player.vimeo.com/video/1135043539" -> "1135043539"
   */
  private extractGrammarVideoId() {
    console.log('🔧 extractGrammarVideoId method called');

    if (!this.grammarLink) {
      console.log('⚠️  grammarLink is empty, setting grammarVideoId to null');
      this.grammarVideoId = null;
      return;
    }

    const match = this.grammarLink.match(/\/video\/(\d+)/);
    this.grammarVideoId = match ? match[1] : null;

    console.log('🎯 Regex match result:', match);
    console.log('💾 Final grammarVideoId:', this.grammarVideoId);
  }
}
