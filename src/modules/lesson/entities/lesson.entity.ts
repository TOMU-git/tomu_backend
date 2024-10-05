import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity';
import { Grammar } from 'src/modules/grammar/entities/grammar.entity';
import { Homework } from 'src/modules/homework/entities/homework.entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';

@Entity('lessons') // Entity nomini belgilash
export class Lesson extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  video_url: string;

  @Column({ type: 'int' })
  /**
   * Darsning tartibini belgilaydi.
   * Bu maydon yordamida darslar o'zaro bog'liq ravishda tartiblangan holda ko'rsatiladi.
   * O'quv jarayonida foydalanuvchilar darslarni belgilangan tartibda o'qishi mumkin.
   * Misol uchun, agar darslar 1, 2, 3 ko'rinishida belgilangan bo'lsa,
   * foydalanuvchilar 1-darsdan 2-darsga, keyin esa 3-darsga o'tishlari mumkin.
   */
  order: number;

  @ManyToOne(() => Block, (block) => block.lessons)
  block: Block;

  // Bu yerda Grammar bilan bog'lanish
  @OneToOne(() => Grammar, (grammar) => grammar.lesson)
  grammar: Grammar;

  @OneToOne(() => Homework, (homework) => homework.lesson)
  homework: Homework;
}
