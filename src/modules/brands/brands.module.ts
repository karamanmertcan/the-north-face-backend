import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { IkasService } from 'src/services/ikas.service';
import { ProductsService } from '../products/products.service';
import { Product, ProductSchema } from 'src/schemas/product.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from 'src/schemas/favorite.schema';
import { Brand, BrandSchema } from 'src/schemas/brand.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { BrandFollowers, BrandFollowersSchema } from 'src/schemas/brand-followers.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Video, VideoSchema } from 'src/schemas/video.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: BrandFollowers.name, schema: BrandFollowersSchema },
      { name: User.name, schema: UserSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
  ],
  controllers: [BrandsController],
  providers: [BrandsService, IkasService, ProductsService],
})
export class BrandsModule { }
