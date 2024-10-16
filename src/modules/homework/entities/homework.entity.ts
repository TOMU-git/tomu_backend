import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

@Entity('homeworks')
export class Homework extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  assignment_video_url: string;

  @Column({ type: 'text' })
  description: string;

  @OneToOne(() => Lesson, (lesson) => lesson.homework)
  @JoinColumn()
  lesson: Lesson;

  @ManyToOne(() => Block, (block) => block.homeworks, {
    nullable: true, // Block can be null if homework is not associated with any block
    onDelete: 'SET NULL', // If a block is deleted, set the block field to null
  })
  @JoinColumn() // Establish the join column for the relationship
  block: Block; // Reference to the block associated with this homework
}
