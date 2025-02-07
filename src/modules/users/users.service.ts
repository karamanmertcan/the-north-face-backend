import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { Video, VideoDocument } from 'src/schemas/video.schema';
import { FollowersFollowings, FollowersFollowingsDocument } from 'src/schemas/followers-followings.schema';
import { UpdateUserDto } from 'src/dtos/user/update-user.dto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getS3Config } from 'src/config/s3.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {

    private s3Client: S3Client;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        @InjectModel(FollowersFollowings.name) private followersFollowingsModel: Model<FollowersFollowingsDocument>,
        private configService: ConfigService,
    ) {
        this.s3Client = getS3Config(configService);
    }

    getUser(userId: string) {
        return this.userModel.findById({
            _id: userId
        }).select('-password').lean();
    }

    async getUserProfileWithVideos(userId: string) {
        const user = await this.userModel.findById({
            _id: userId
        }).select('-password').lean();

        const videos = await this.videoModel.find({
            creator: userId
        }).lean();

        const followers = await this.followersFollowingsModel.find({
            following: userId
        }).countDocuments().lean();

        const following = await this.followersFollowingsModel.find({
            follower: userId
        }).countDocuments().lean();

        return {
            user,
            videos,
            followers,
            following
        }

    }

    getUserByIkasId(ikasId: string) {
        return this.userModel.findOne({ ikasId }).lean();
    }

    createUser(user: User) {
        return this.userModel.create(user);
    }


    async getUserVideos(userId: string) {
        return this.videoModel.find({
            creator: userId
        }).lean();
    }


    async updateUser(userId: string, updateUserDto: UpdateUserDto) {
        if (updateUserDto.username) {
            const user = await this.userModel.findOne({ username: updateUserDto.username }).lean();
            if (user) {
                throw new BadRequestException('Kullanıcı adı zaten kullanılıyor.');
            }
        }

        const user = await this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true }).lean();


        return user;
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        try {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.configService.get('AWS_BUCKET_NAME'),
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const avatarUrl = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileName}`;

            console.log('avatarUrl', avatarUrl)

            const updatedUser = await this.userModel.findByIdAndUpdate(
                userId,
                { avatar: avatarUrl },
                { new: true }
            );

            return updatedUser;
        } catch (error) {
            console.error('Avatar yükleme hatası:', error);
            throw new Error('Avatar yüklenemedi');
        }
    }

}
