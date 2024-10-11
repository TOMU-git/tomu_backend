import { BaseEntity } from 'src/common/database/baseEntity';
import { Entity, Column } from 'typeorm';

@Entity()
export class Chat extends BaseEntity {
  @Column({ nullable: false })
  userId: number;

  @Column({ nullable: false })
  message: string;
}
