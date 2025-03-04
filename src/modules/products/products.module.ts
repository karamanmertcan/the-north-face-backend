import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { IkasService } from 'src/services/ikas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from 'src/schemas/favorite.schema';
import { Product, ProductSchema } from 'src/schemas/product.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { Video, VideoSchema } from 'src/schemas/video.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Brand, BrandSchema } from 'src/schemas/brand.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Video.name, schema: VideoSchema },
      { name: User.name, schema: UserSchema },
      { name: Brand.name, schema: BrandSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, IkasService],
})
export class ProductsModule { }
