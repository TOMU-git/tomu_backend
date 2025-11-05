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
import { ICourseService } from '../course/interfaces/course.service';
import { config } from 'src/common/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OrdersService implements IOrderService {
  constructor(
    @Inject("IOrderRepository") private readonly orderRepository: IOrderRepository,
    @Inject("IUserService") private readonly userService: IUserService,
    @Inject("ITariffService") private readonly tariffService: ITariffService,
    @Inject("ILiveChatService") private readonly liveChatService: ILiveChatService,
    @Inject("ICourseService") private readonly courseService: ICourseService,
    private jwtService: JwtService,
  ) { }

  async createOrder(orderDto: CreateOrderDto): Promise<ResData<IOrderCreateReturn>> {
    console.log("=== ORDER CREATION START DEBUG ===");
    console.log("1. Order DTO received:", {
      userId: orderDto.userId,
      courseId: orderDto.courseId,
      tariffId: orderDto.tariffId,
      tariffIdType: typeof orderDto.tariffId,
      liveChatId: orderDto.liveChatId,
      paymentType: orderDto.paymentType,
    });

    const foundUser = await this.userService.findOneById(orderDto.userId);
    const foundCourse = await this.courseService.findOneById(orderDto.courseId);
    const newOrder = new OrderEntity();
    newOrder.userId = orderDto.userId;
    newOrder.type = orderDto.paymentType;

    console.log("2. Before setting tariffId:", {
      orderDtoTariffId: orderDto.tariffId,
      conditionResult: !!orderDto.tariffId,
    });

    if (orderDto.tariffId) {
      console.log("3. Entered tariffId block");
      const { data: foundTariff } = await this.tariffService.findOne(orderDto.tariffId);
      console.log("4. Found Tariff:", {
        id: foundTariff?.id,
        courseId: foundTariff?.courseId,
        price: foundTariff?.price,
      });
      newOrder.tariffId = orderDto.tariffId;
      newOrder.courseId = foundTariff.courseId;
      newOrder.totalPrice = foundTariff.price;
      console.log("5. After setting tariffId to newOrder:", {
        tariffId: newOrder.tariffId,
        courseId: newOrder.courseId,
        totalPrice: newOrder.totalPrice,
      });
    } else {
      console.log("3. SKIPPED - tariffId not provided in DTO");
    }

    if (orderDto.liveChatId) {
      console.log("6. Entered liveChatId block");
      const { data: foundLiveChat } = await this.liveChatService.findOne(orderDto.liveChatId);
      newOrder.liveChatId = orderDto.liveChatId;
      newOrder.courseId = foundLiveChat.selectedCourseId;
      newOrder.totalPrice = foundLiveChat.price;
    }

    newOrder.status = OrderStatus.PENDING;
    const callBackUrl = `https://tomu.uz/kurslar`;

    console.log("7. Before saving to DB - newOrder:", {
      userId: newOrder.userId,
      tariffId: newOrder.tariffId,
      tariffIdType: typeof newOrder.tariffId,
      liveChatId: newOrder.liveChatId,
      courseId: newOrder.courseId,
      totalPrice: newOrder.totalPrice,
      status: newOrder.status,
    });

    const createdOrder = await this.orderRepository.create(newOrder);

    console.log("=== ORDER CREATION DEBUG ===");
    console.log("8. Created order from DB:", {
      id: createdOrder.id,
      tariffId: createdOrder.tariffId,
      tariffIdType: typeof createdOrder.tariffId,
      liveChatId: createdOrder.liveChatId,
      courseId: createdOrder.courseId,
      totalPrice: createdOrder.totalPrice,
      totalPriceType: typeof createdOrder.totalPrice,
      totalPriceNumber: Number(createdOrder.totalPrice),
    });
    console.log("===========================");

    const url = buildPaymeApi(orderDto.userId, createdOrder.id, Number(createdOrder.totalPrice), callBackUrl);
    return new ResData<IOrderCreateReturn>("Order created successfully", 201, { order: createdOrder, url: url });
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
