import { ResData } from "src/lib/resData";
import { OrderEntity } from "../entities/order.entity";
import { CreateOrderDto } from "../dto/create-order.dto";

export interface IOrderCreateReturn {
    order: OrderEntity;
    url: string;
}

export interface IOrderService {
    createOrder(orderDto: CreateOrderDto): Promise<ResData<IOrderCreateReturn>>;
    getAllOrders(): Promise<ResData<OrderEntity[]>>;
    getOrderById(id: number): Promise<ResData<OrderEntity>>;
}