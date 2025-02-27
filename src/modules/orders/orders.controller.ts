import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('orders')
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('taggable-products')
  async getTaggableProducts(@Request() req) {
    return this.ordersService.getUserOrderedProducts(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  async refundOrder(
    @Param('id') orderId: string,
    @Body()
    refundData: {
      orderLineItemId: string;
      quantity: number;
      price: number;
      stockLocationId: string;
    },
  ) {
    console.log('Refund Data:', orderId);
    return this.ordersService.refundOrder(
      orderId,
      refundData.orderLineItemId,
      refundData.quantity,
      refundData.price,
      refundData.stockLocationId,
    );
  }

  @Post('sync')
  async syncOrders() {
    return this.ordersService.syncOrders();
  }
}
