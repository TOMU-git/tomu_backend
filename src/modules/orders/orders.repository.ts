import { InjectRepository } from "@nestjs/typeorm";
import { IOrderRepository } from "./interfaces/repository-interface";
import { OrderEntity } from "./entities/order.entity";
import { Repository } from "typeorm";

export class OrderRepository implements IOrderRepository {
    constructor(@InjectRepository(OrderEntity) private readonly repository: Repository<OrderEntity>) { }
    
    async create(entity: OrderEntity): Promise<OrderEntity> {
        return this.repository.save(entity);
    }
    
    async findAll(): Promise<OrderEntity[]> {
        return this.repository.find();
    }
    
    async findOneById(id: number): Promise<OrderEntity | null> {
        return this.repository.findOneBy({ id });
    }
    
    async update(entity: OrderEntity): Promise<OrderEntity> {
        return this.repository.save(entity);
    }
}