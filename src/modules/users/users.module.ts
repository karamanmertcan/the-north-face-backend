import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Video, VideoSchema } from 'src/schemas/video.schema';
import {
  FollowersFollowings,
  FollowersFollowingsSchema,
} from 'src/schemas/followers-followings.schema';
import { LikeVideo, LikeVideoSchema } from 'src/schemas/like-video.schema';
import { Favorite, FavoriteSchema } from 'src/schemas/favorite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    MongooseModule.forFeature([
      { name: FollowersFollowings.name, schema: FollowersFollowingsSchema },
    ]),
    MongooseModule.forFeature([
      { name: LikeVideo.name, schema: LikeVideoSchema },
    ]),
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
