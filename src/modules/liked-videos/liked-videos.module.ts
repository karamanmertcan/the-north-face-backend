import { Module } from '@nestjs/common';
import { LikedVideosService } from './liked-videos.service';
import { LikedVideosController } from './liked-videos.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeVideo, LikeVideoSchema } from 'src/schemas/like-video.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LikeVideo.name, schema: LikeVideoSchema },
    ]),
  ],
  controllers: [LikedVideosController],
  providers: [LikedVideosService],
})
export class LikedVideosModule {}
