import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { IkasService } from 'src/services/ikas.service';
import { UuidModule } from 'nestjs-uuid';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  PendingOrder,
  PendingOrderSchema,
} from 'src/schemas/pending-order.schema';

@Module({
  imports: [
    ConfigModule,
    UuidModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PendingOrder.name, schema: PendingOrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, OrdersService, IkasService],
})
export class PaymentModule {}
