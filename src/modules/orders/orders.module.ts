import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { IkasService } from 'src/services/ikas.service';
import { UuidModule } from 'nestjs-uuid';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    ConfigModule,
    UuidModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, IkasService],
  exports: [OrdersService],
})
export class OrdersModule {}
