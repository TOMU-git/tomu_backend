import { BaseEntity } from "src/common/database/baseEntity";
import { Course } from "src/modules/course/entities/course.entity";
import { UserTariff } from "src/modules/user-tariff/entities/user-tariff.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

@Entity("tariffs")
export class Tariff extends BaseEntity {
  @Column({ type: "varchar", length: 256, nullable: false })
  name: string;

  @Column({ type: "int", nullable: false })
  duration: number;

  @Column({ type: "bigint", nullable: false })
  price: number;

  // Bir nechta variantlarni saqlash uchun JSON massivi maydoni
  @Column({ type: "json", nullable: true })
  options?: string[];

  @Column({ name: 'course_id', type: 'int', nullable: false })
  courseId: number;
}
