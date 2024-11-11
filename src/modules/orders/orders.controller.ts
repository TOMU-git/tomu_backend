import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { IOrderService } from './interfaces/service-interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(@Inject("IOrderService") private readonly ordersService: IOrderService) { }
  
  @Post('create')
  async create(@Body() createOrderDto: CreateOrderDto) { 
    return await this.ordersService.createOrder(createOrderDto);
  }
  @Get()
  async findAll() {
    return await this.ordersService.getAllOrders();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }
}
