import { Module } from '@nestjs/common';
import { User, UserSchema } from 'src/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { Video, VideoSchema } from 'src/schemas/video.schema';
import { Comment, CommentSchema } from 'src/schemas/comment.schema';
import { LikeVideo, LikeVideoSchema } from 'src/schemas/like-video.schema';
import {
  FollowersFollowings,
  FollowersFollowingsSchema,
} from 'src/schemas/followers-followings.schema';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    MongooseModule.forFeature([
      { name: LikeVideo.name, schema: LikeVideoSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: FollowersFollowings.name, schema: FollowersFollowingsSchema },
    ]),
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
