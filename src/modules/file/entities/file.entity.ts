import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("files")
export class File extends BaseEntity {
  @Column({ name: "location", type: "text", nullable: false })
  path: string;

  @Column({
    name: "original_name",
    type: "varchar",
    length: 256,
    nullable: true,
  })
  originalname: string;

  @Column({ name: "mime_type", type: "varchar", nullable: false })
  mimetype: string;

  @Column({ type: "int", nullable: false })
  size: number;
}
