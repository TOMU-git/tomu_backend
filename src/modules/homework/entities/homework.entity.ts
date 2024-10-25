import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { HomeworkProgress } from 'src/modules/homework-progress/entities/homework-progress.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('homeworks')
export class Homework extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  /**
   * Darsning tartibini belgilaydi.
   * Bu maydon yordamida darslar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar darslarni belgilangan tartibda o'qishi mumkin.
   * Misol uchun, agar darslar 1, 2, 3 ko'rinishida belgilangan bo'lsa,
   * foydalanuvchilar 1-darsdan 2-darsga, keyin esa 3-darsga o'tishlari mumkin.
   */
  order: number;

  @Column({ type: 'int' })
  duration: number;

  @ManyToOne(() => Block, (block) => block.homeworks)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.homework,
  )
  homeworkProgresses: HomeworkProgress[];
}
