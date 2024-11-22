import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { UserModule } from '../user/user.module';
import { OrderRepository } from './orders.repository';
import { TariffModule } from '../tariff/tariff.module';
import { LiveChatModule } from '../live-chat/live-chat.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), UserModule, TariffModule, LiveChatModule, CourseModule],
  controllers: [OrdersController],
  providers: [
    { provide: "IOrderService", useClass: OrdersService },
    { provide: "IOrderRepository", useClass: OrderRepository },
  ],
  exports: [
    { provide: "IOrderService", useClass: OrdersService },
    { provide: "IOrderRepository", useClass: OrderRepository },
  ],
})
export class OrdersModule {}
