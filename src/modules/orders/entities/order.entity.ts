import { BaseEntity } from "src/common/database/baseEntity";
import { PaymentTypeEnum } from "src/common/enums/enum";
import { OrderStatus } from "src/common/enums/order-status";
import { Column, Entity } from "typeorm";

@Entity('orders')
export class OrderEntity extends BaseEntity {
    @Column({ name: 'user_id', type: 'int', nullable: false })
    userId: number; 

    @Column({ name: 'type', type: 'enum', enum: PaymentTypeEnum, nullable: false})
    type: PaymentTypeEnum

    @Column({ name: 'total_price', type: 'bigint', nullable: false })
    totalPrice: number;

    @Column({ name: 'status', type: 'enum', enum: OrderStatus, nullable: false })
    status: OrderStatus;

    @Column({ name: 'live_chat_id', type: 'int', nullable: true, unique: true, default: null })
    liveChatId: number; 
    
    @Column({ name: 'tariff_id', type: 'int', nullable: true, default: null })
    tariffId: number;

    @Column({ name: 'course_id', type: 'int', nullable: true, default: null })
    courseId: number;
}
