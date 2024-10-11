import { IsPhoneNumber } from 'class-validator';
import { BaseEntity } from 'src/common/database/baseEntity';
import { GenderEnum, RoleEnum } from 'src/common/enums/enum';
import { Feedback } from 'src/modules/feedback/entities/feedback.entity';
import { UserCourse } from 'src/modules/user-courses/entities/user-course.entity';
import { UserTariff } from 'src/modules/user-tariff/entities/user-tariff.entity';
import {
  Entity,
<<<<<<< HEAD
  Column
=======
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToMany,
>>>>>>> a51bcfa36b30da7d3963da419e9d93fd73fef9d2
} from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 256, nullable: false })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 256, nullable: false })
  lastName: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 15, nullable: true })
  @IsPhoneNumber(null) // null => har qanday mamlakat kodini qo'llab-quvvatlaydi
  phoneNumber: string;

  @Column({ type: 'enum', enum: GenderEnum, nullable: false })
  gender: GenderEnum;

  @Column({ type: 'text', nullable: false })
  password: string;

  @Column({ type: 'enum', enum: RoleEnum, nullable: false })
  role: RoleEnum;

<<<<<<< HEAD
  @Column({ name: "hashed_refresh_token", type: 'varchar', nullable: true })
  hashed_refresh_token: string;
=======
  @OneToMany(() => UserTariff, (userTariff) => userTariff.user, {
    onDelete: 'SET NULL',
  })
  userTariffs: UserTariff[];

  @OneToMany(() => UserCourse, (userCourse) => userCourse.user, {
    onDelete: 'NO ACTION',
  })
  userCourses: UserCourse[];

  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];
>>>>>>> a51bcfa36b30da7d3963da419e9d93fd73fef9d2
}
