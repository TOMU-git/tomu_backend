import { BaseEntity } from 'src/common/database/baseEntity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('homeworks')
export class Homework extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  assignment_video_url: string;

  @Column({ type: 'text' })
  description: string;

  @OneToOne(() => Lesson, (lesson) => lesson.homework)
  @JoinColumn()
  lesson: Lesson;
}
