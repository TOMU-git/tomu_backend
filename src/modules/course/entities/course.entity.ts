import { BaseEntity } from 'src/common/database/baseEntity';
import { Module } from 'src/modules/module/entities/module.entity';
import { Column, OneToMany } from 'typeorm';

export class Course extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  instructor: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Module, (module) => module.course)
  modules: Module[];
}
