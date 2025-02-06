import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { Video, VideoDocument } from 'src/schemas/video.schema';
@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>

    ) { }

    getUser(userId: string) {
        return this.userModel.findById({
            _id: userId
        });
    }

    getUserByIkasId(ikasId: string) {
        return this.userModel.findOne({ ikasId });
    }

    createUser(user: User) {
        return this.userModel.create(user);
    }


    async getUserVideos(userId: string) {
        return this.videoModel.find({
            creator: userId
        }).lean();
    }


}
