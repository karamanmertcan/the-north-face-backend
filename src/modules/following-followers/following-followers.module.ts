import { Module } from '@nestjs/common';
import { FollowingFollowersService } from './following-followers.service';
import { FollowingFollowersController } from './following-followers.controller';
import { FollowersFollowings, FollowersFollowingsSchema } from 'src/schemas/followers-followings.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: FollowersFollowings.name, schema: FollowersFollowingsSchema }])],
  controllers: [FollowingFollowersController],
  providers: [FollowingFollowersService],
})
export class FollowingFollowersModule { }
