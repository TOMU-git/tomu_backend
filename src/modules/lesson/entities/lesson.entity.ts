import { BaseEntity } from 'src/common/database/baseEntity';
import { Grammar } from 'src/modules/grammar/entities/grammar.entity';
import { Homework } from 'src/modules/homework/entities/homework.entity';
import { Module } from 'src/modules/module/entities/module.entity';
import { Column, ManyToOne, OneToOne } from 'typeorm';

export class Lesson extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  video_url: string;

  @Column({ type: 'int' })
  order: number;

  @ManyToOne(() => Module, (module) => module.lessons)
  module: Module;

  @OneToOne(() => Grammar, (grammar) => grammar.lesson)
  grammar: Grammar;

  @OneToOne(() => Homework, (homework) => homework.lesson)
  homework: Homework;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
