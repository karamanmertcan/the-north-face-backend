import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { IkasService } from 'src/services/ikas.service';
import { UuidModule } from 'nestjs-uuid';

@Module({
  imports: [ConfigModule, UuidModule],
  controllers: [OrdersController],
  providers: [OrdersService, IkasService],
  exports: [OrdersService]
})
export class OrdersModule { }
