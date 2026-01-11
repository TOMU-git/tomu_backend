import { BaseEntity } from "src/common/database/baseEntity";
import { Block } from "src/modules/block/entities/block.entity";
import { HomeworkProgress } from "src/modules/homework-progress/entities/homework-progress.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

@Entity("homeworks")
export class Homework extends BaseEntity {
  @Column({ type: "varchar", length: 500, nullable: true })
  title: string;

  /**
   * Video URL manzili.
   * Homework uchun video manzil.
   */
  @Column({ type: "varchar", length: 255, name: "video_url" })
  videoUrl: string;

  @Column({ type: "varchar", length: 50, name: "vimeo_video_id", nullable: true })
  vimeoVideoId: string;



  /**
   * Fayl turi (mimetype).
   * Masalan, 'video/mp4'.
   */
  @Column({ type: "varchar", length: 50, name: "mime_type" })
  mimetype: string;

  /**
   * Fayl hajmi (baytlarda).
   * Yuklangan fayl hajmi.
   */
  @Column({ type: "int" })
  size: number;

  /**
   * Tartib raqami.
   * Homework ko'rsatish tartibi.
   */
  @Column({ type: "int", nullable: false })
  order: number;

  /**
   * Davomiylik (soniyalarda).
   * Homework davomiyligi.
   */
  @Column({ type: "int" })
  duration: number;

  @Column({ type: "int", name: "block_id", nullable: true })
  blockId: number;

  @ManyToOne(() => Block, (block) => block.homeworks, {
    nullable: true, // Block mavjud bo'lmasa null bo'lishi mumkin
    onDelete: "SET NULL", // Block o'chirilsa, qiymati null qilinadi
  })
  @JoinColumn({ name: "block_id" }) // Bog'lanish uchun ustun nomi
  block: Block; // Homeworkga tegishli block

  /**
   * Homework progresslari.
   * Homework va HomeworkProgress o'rtasidagi aloqani bildiradi.
   */
  @OneToMany(
    () => HomeworkProgress,
    (homeworkProgress) => homeworkProgress.homework,
  )
  homeworkProgresses: HomeworkProgress[];
}
