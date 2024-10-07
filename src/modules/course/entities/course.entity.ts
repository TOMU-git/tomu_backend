import { BaseEntity } from 'src/common/database/baseEntity';
import { Block } from 'src/modules/block/entities/block.entity'; // O'zgartirish: Module o'rniga Block
import { UserCourse } from 'src/modules/user-courses/entities/user-course.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('courses')
export class Course extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  instructor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string; // Rasm URL manzili

  @OneToMany(() => UserCourse, (userCourse) => userCourse.user, {
    onDelete: 'NO ACTION',
  })
  userCourses: UserCourse;

  @OneToMany(() => Block, (block) => block.course, {
    onDelete: 'NO ACTION',
    nullable: true,
  })
  blocks: Block[]; // Blocklar bilan bog'liq
}
