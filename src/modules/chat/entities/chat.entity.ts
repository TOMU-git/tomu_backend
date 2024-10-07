import { BaseEntity } from 'src/common/database/baseEntity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Chat extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  message: string;
}
