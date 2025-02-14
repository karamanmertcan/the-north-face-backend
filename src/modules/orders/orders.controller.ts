import { Body, Controller, Post, UseGuards, Get, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Body() orderData: any) {
    return this.ordersService.createOrder(orderData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Request() req) {
    return this.ordersService.getUserOrders(req.user.email);
  }
}
