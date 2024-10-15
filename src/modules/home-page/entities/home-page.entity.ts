import { BaseEntity } from 'src/common/database/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity('home-page')
export class HomePage extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;
  
  @Column({ type: 'json', nullable: true })
  preferences: string[];
}
