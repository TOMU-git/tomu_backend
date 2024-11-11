import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { IOrderCreateReturn, IOrderService } from './interfaces/service-interface';
import { ResData } from 'src/lib/resData';
import { OrderEntity } from './entities/order.entity';
import { IOrderRepository } from './interfaces/repository-interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { IUserService } from '../user/interfaces/user.service';
import { OrderStatus } from 'src/common/enums/order-status';
import { ITariffService } from '../tariff/interface/tariff.service';
import { ILiveChatService } from '../live-chat/interfaces/service-interface';
import { buildPaymeApi } from 'src/lib/urlBuild';

@Injectable()
export class OrdersService implements IOrderService {
  constructor(
    @Inject("IOrderRepository") private readonly orderRepository: IOrderRepository,
    @Inject("IUserService") private readonly userService : IUserService,
    @Inject("ITariffService") private readonly tariffService : ITariffService,
    @Inject("ILiveChatService") private readonly liveChatService : ILiveChatService,
  ) { }
  
  async createOrder(orderDto: CreateOrderDto): Promise<ResData<IOrderCreateReturn>> {
    const foundUser = await this.userService.findOneById(orderDto.userId);
    const newOrder = new OrderEntity();
    newOrder.userId = orderDto.userId;
    newOrder.type = orderDto.paymentType;
    if (orderDto.tariffId) {
      const { data: foundTariff } = await this.tariffService.findOne(orderDto.tariffId);
      newOrder.tariffId = orderDto.tariffId;
      newOrder.totalPrice = foundTariff.price;
    }
    if (orderDto.liveChatId) {
      const { data: foundLiveChat } = await this.liveChatService.findOne(orderDto.liveChatId);
      newOrder.liveChatId = orderDto.liveChatId;
      newOrder.totalPrice = foundLiveChat.price;
    }
    newOrder.status = OrderStatus.PENDING;
    const callBackUrl = 'https://www.tomu.uz/';
    const createdOrder = await this.orderRepository.create(newOrder);
    const url = buildPaymeApi(orderDto.userId, createdOrder.id, createdOrder.totalPrice, callBackUrl);
    return new ResData<IOrderCreateReturn>("Order created successfully", 201, {order: createdOrder, url: url});
  }
  async getAllOrders(): Promise<ResData<OrderEntity[]>> {
    const foundOrders = await this.orderRepository.findAll();
    return new ResData<OrderEntity[]>("All orders", 200, foundOrders);
  }

  async getOrderById(id: number): Promise<ResData<OrderEntity>> {
    const foundOrder = await this.orderRepository.findOneById(id);
    if (!foundOrder) { 
      throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
    }
    return new ResData<OrderEntity>("Found order", 200, foundOrder);
  }
}
