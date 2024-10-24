import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { HomeworkProgress } from 'src/modules/homework-progress/entities/homework-progress.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('homeworks')
export class Homework extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'video_url' })
  assignment_video_url: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Block, (block) => block.homeworks)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.homework,
  )
  homeworkProgresses: HomeworkProgress[];
}
