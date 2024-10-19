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

  @ManyToOne(() => Block, (block) => block.homeworks, {
    nullable: true, // Block can be null if homework is not associated with any block
    onDelete: 'SET NULL', // If a block is deleted, set the block field to null
  })
  @JoinColumn() // Establish the join column for the relationship
  block: Block; // Reference to the block associated with this homework

  @Column({ name: 'block_id', type: 'int', nullable: false })
  blockId: number;

  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.homework,
  )
  homeworkProgresses: HomeworkProgress[];
}
