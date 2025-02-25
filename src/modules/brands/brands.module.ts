import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { IkasService } from 'src/services/ikas.service';
import { ProductsService } from '../products/products.service';
import { Product, ProductSchema } from 'src/schemas/product.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from 'src/schemas/favorite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
  ],
  controllers: [BrandsController],
  providers: [BrandsService, IkasService, ProductsService],
})
export class BrandsModule {}
