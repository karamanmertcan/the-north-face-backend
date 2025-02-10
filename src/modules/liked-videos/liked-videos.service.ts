import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LikeVideo, LikeVideoDocument } from 'src/schemas/like-video.schema';
import { Model } from 'mongoose';
@Injectable()
export class LikedVideosService {
    constructor(
        @InjectModel(LikeVideo.name) private likeVideoModel: Model<LikeVideoDocument>,
    ) { }

    getLikedVideos(userId: string) {
        return this.likeVideoModel.find({ user: userId }).populate('video').populate('user', '-password');
    }
}
