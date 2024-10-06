import { IsPhoneNumber } from 'class-validator';
import { BaseEntity } from 'src/common/database/baseEntity';
import { GenderEnum, RoleEnum } from 'src/common/enums/enum';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
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
}
