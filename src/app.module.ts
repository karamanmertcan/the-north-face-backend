import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { VideoModule } from './modules/video/video.module';
import { FollowingFollowersModule } from './modules/following-followers/following-followers.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ProductsModule } from './modules/products/products.module';
import { BrandsModule } from './modules/brands/brands.module';
import { UsersModule } from './modules/users/users.module';
import { LikedVideosModule } from './modules/liked-videos/liked-videos.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { IkasModule } from './modules/ikas/ikas.module';
import { PaymentModule } from './modules/payment/payment.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UuidModule } from 'nestjs-uuid';
import { CustomersModule } from './modules/customers/customers.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UuidModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    VideoModule,
    FollowingFollowersModule,
    CommentsModule,
    ProductsModule,
    BrandsModule,
    UsersModule,
    LikedVideosModule,
    FavoritesModule,
    IkasModule,
    PaymentModule,
    OrdersModule,
    CustomersModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
