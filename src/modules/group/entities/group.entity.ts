import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, OneToMany } from "typeorm";

@Entity("groups")
export class Group extends BaseEntity {
    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "int", nullable: false })
    count: number;

    @OneToMany(() => User, (user) => user.group)
    users: User[]
}
