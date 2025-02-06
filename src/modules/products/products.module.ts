import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { IkasService } from '../../services/ikas.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, IkasService],
})
export class ProductsModule { }
