import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { Feedback } from 'src/modules/feedback/entities/feedback.entity';
import { Grammar } from 'src/modules/grammar/entities/grammar.entity';
import { UserCourse } from 'src/modules/user-courses/entities/user-course.entity';
import { Tariff } from 'src/modules/tariff/entities/tariff.entity'; // Tariffni import qilish
import { Column, Entity, OneToMany } from 'typeorm';
import { Alphabet } from 'src/modules/alphabet/entities/alphabet.entity';

@Entity('courses')
export class Course extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'varchar', length: 50, name: 'mime_type' })
  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4', 'video/x-ms-wmv' va hokazo.
   * Bu maydon dars bilan bog'liq faylning turini aniqlashga yordam beradi.
   */
  imageMimetype: string;

  @Column({ type: 'int', name: 'image_size' })
  /**
   * Faylning o'lchamini baytlarda ko'rsatadi.
   * Bu maydon yuklangan faylning hajmini nazorat qilish va foydalanuvchiga ma'lumot berish imkonini beradi.
   */
  imageSize: number;

  @Column({ type: 'varchar', length: 50, name: 'video_type' })
  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4', 'video/x-ms-wmv' va hokazo.
   * Bu maydon dars bilan bog'liq faylning turini aniqlashga yordam beradi.
   */
  videoMimetype: string;

  @Column({ type: 'int', name: 'video_size' })
  /**
   * Faylning o'lchamini baytlarda ko'rsatadi.
   * Bu maydon yuklangan faylning hajmini nazorat qilish va foydalanuvchiga ma'lumot berish imkonini beradi.
   */
  videoSize: number;

  // Foydalanuvchi o'qigan kurslar bilan bog'lanish
  @OneToMany(() => UserCourse, (userCourse) => userCourse.course, {
    onDelete: 'NO ACTION',
  })
  userCourses: UserCourse[];

  // Feedbacklar bilan bog'lanish
  @OneToMany(() => Feedback, (feedback) => feedback.course, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  feedbacks: Feedback[];

  // Blocklar bilan bog'lanish
  @OneToMany(() => Block, (block) => block.course, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  blocks: Block[];
  
  @OneToMany(() => Alphabet, (alphabet) => alphabet.course, {
    onDelete: 'NO ACTION',
  })
  alphabets: Alphabet[];

  // Tariflar bilan bog'lanish
  @OneToMany(() => Tariff, (tariff) => tariff.course, {
    onDelete: 'CASCADE',
  })
  tariffs: Tariff[];
}
