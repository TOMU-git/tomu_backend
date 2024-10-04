import { BaseEntity } from 'src/common/database/baseEntity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, JoinColumn, OneToOne } from 'typeorm';

export class Homework extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  assignment_video_url: string;

  @Column({ type: 'text' })
  description: string;

  @OneToOne(() => Lesson, (lesson) => lesson.homework)
  @JoinColumn()
  lesson: Lesson;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
