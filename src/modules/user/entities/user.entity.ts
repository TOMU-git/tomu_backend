import { IsPhoneNumber } from 'class-validator';
import { BaseEntity } from 'src/common/database/baseEntity';
import { RoleEnum } from 'src/common/enums/enum';
import { Entity, Column } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 256, nullable: false })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 256, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 256, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  @IsPhoneNumber(null) // null => har qanday mamlakat kodini qo'llab-quvvatlaydi
  phoneNumber: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: false })
  gender: 'male' | 'female' | 'other';

  @Column({ type: 'text', nullable: false })
  password: string;

  @Column({ type: 'enum', enum: RoleEnum, nullable: false })
  role: RoleEnum;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
