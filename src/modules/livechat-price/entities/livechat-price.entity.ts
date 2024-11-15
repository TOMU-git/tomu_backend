import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity } from "typeorm";

@Entity('livechat_price')
export class LivechatPriceEntity extends BaseEntity {
    @Column({ name: 'price', type: 'int', nullable: false })
    price: number;
}
