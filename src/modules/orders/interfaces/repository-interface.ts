import { OrderEntity } from "../entities/order.entity";

export interface IOrderRepository {
    create(entity: OrderEntity): Promise<OrderEntity>;
    findAll(): Promise<OrderEntity[]>;
    findOneById(id: number): Promise<OrderEntity | null>;
    update(entity: OrderEntity): Promise<OrderEntity>;
}