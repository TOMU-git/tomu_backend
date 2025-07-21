  import { BaseEntity } from "src/common/database/baseEntity";
  import { User } from "src/modules/user/entities/user.entity";
  import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
  import { Homework } from "src/modules/homework/entities/homework.entity";

  @Entity("homework_progress")
  export class HomeworkProgress extends BaseEntity {
    /**
     * Blokning tartib raqami.
     * Ushbu maydon, darsning qaysi blokda ekanligini ifodalaydi.
     */
    @Column({ type: "int", name: "block_order", nullable: false })
    blockOrder: number;

    /**
     * Homework tartib raqami.
     * Ushbu maydon, homeworkning tartib raqamini ifodalaydi.
     */
    @Column({ type: "int", name: "homework_order", nullable: false })
    homeworkOrder: number;

    /**
     * Foydalanuvchi ID'si.
     */
    @Column({ type: "int", name: "user_id", nullable: false })
    userId: number;

    /**
     * Block ID'si.
     */
    @Column({ type: "int", name: "block_id", nullable: false })
    blockId: number;

    /**
     * Kurs ID'si.
     */
    @Column({ type: "int", name: "course_id", nullable: false })
    courseId: number;

    /**
     * Homework ko'rilganligini bildiruvchi ustun (true - ko'rilgan, false - ko'rilmagan).
     */
    @Column({
      type: "boolean",
      default: true,
      name: "is_watched",
      nullable: false,
    })
    isWatched: boolean;

    /**
     * Homework qancha marta ko'rilganligini hisoblaydigan ustun.
     */
    @Column({ type: "int", name: "count_watched", default: 0 })
    countWatched: number;

    /**
     * Foydalanuvchiga tegishli homework_progress yozuvi.
     */
    @ManyToOne(() => User, (user) => user.homeworkProgresses)
    @JoinColumn({ name: "user_id" })
    user: User;

    /**
     * Ushbu homework uchun progress yozuvi.
     */
    @ManyToOne(() => Homework, (homework) => homework.homeworkProgresses)
    @JoinColumn({ name: "homework_id" })
    homework: Homework;
  }
