import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { IkasService } from 'src/services/ikas.service';
import { UuidModule } from 'nestjs-uuid';

@Module({
    imports: [ConfigModule, UuidModule],
    controllers: [PaymentController],
    providers: [PaymentService, OrdersService, IkasService]
})
export class PaymentModule { }
