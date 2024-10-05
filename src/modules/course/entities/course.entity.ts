import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity'; // O'zgartirish: Module o'rniga Block
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('courses')
export class Course extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'varchar', length: 255 })
  instructor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string; // Rasm URL manzili

  @OneToMany(() => Block, (block) => block.course)
  blocks: Block[]; // Blocklar bilan bog'liq
}
