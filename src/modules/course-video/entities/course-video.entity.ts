import { BaseEntity } from 'src/common/database/baseEntity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Course } from 'src/modules/course/entities/course.entity';

@Entity('course_video')
export class CourseVideo extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'varchar', length: 50, name: 'mimetype' })
  /**
   * Fayl turini (mimetype) ko'rsatadi, masalan, 'video/mp4'.
   */
  mimetype: string;

  @Column({ type: 'int', name: 'size' })
  /**
   * Video faylining o'lchamini baytlarda ko'rsatadi.
   */
  size: number;
}
