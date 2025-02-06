import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { IkasService } from 'src/services/ikas.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, IkasService],
})
export class BrandsModule { }
