import { BaseEntity } from 'src/common/database/baseEntity';
import { Entity, Column } from 'typeorm';

@Entity()
export class Chat extends BaseEntity {
  @Column({ nullable: false, name: 'user_id' })
  userId: number; // Kodda foydalaniladigan nomi

  @Column({ nullable: false })
  message: string;
}
