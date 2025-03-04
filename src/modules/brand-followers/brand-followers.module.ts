import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandFollowers, BrandFollowersSchema } from '../../schemas/brand-followers.schema';
import { Brand, BrandSchema } from '../../schemas/brand.schema';
import { BrandFollowersController } from './brand-followers.controller';
import { BrandFollowersService } from './brand-followers.service';
import { BrandsService } from '../brands/brands.service';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { Favorite, FavoriteSchema } from '../../schemas/favorite.schema';
import { IkasService } from '../../services/ikas.service';
import { ProductsService } from '../products/products.service';
import { Video, VideoSchema } from 'src/schemas/video.schema';
import { User, UserSchema } from 'src/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: BrandFollowers.name, schema: BrandFollowersSchema },
            { name: Brand.name, schema: BrandSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Favorite.name, schema: FavoriteSchema },
            { name: Video.name, schema: VideoSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [BrandFollowersController],
    providers: [BrandFollowersService, BrandsService, IkasService, ProductsService],
    exports: [BrandFollowersService],
})
export class BrandFollowersModule { } 