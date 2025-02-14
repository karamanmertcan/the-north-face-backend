import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { IkasService } from 'src/services/ikas.service';
import { UuidModule } from 'nestjs-uuid';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/schemas/order.schema';

@Module({
    imports: [ConfigModule, UuidModule,
        MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }])

    ],
    controllers: [PaymentController],
    providers: [PaymentService, OrdersService, IkasService]
})
export class PaymentModule { }
