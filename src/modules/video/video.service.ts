import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getS3Config } from '../../config/s3.config';
import { MakeObjectId } from 'src/pipes/parse-object-id.pipe';

@Injectable()
export class VideoService {
    private s3Client: S3Client;

    constructor(
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        private configService: ConfigService,
    ) {
        this.s3Client = getS3Config(configService);
    }

    async uploadVideo(file: Express.Multer.File, userId: string) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const bucketName = this.configService.get('AWS_BUCKET_NAME');

        // S3'e video yükle
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: `videos/${fileName}`,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );

        // Video kaydını oluştur
        const video = new this.videoModel({
            title: file.originalname,
            description: 'adasdasd',
            videoUrl: `https://${bucketName}.s3.amazonaws.com/videos/${fileName}`,
            thumbnailUrl: 'https://google.com', // Thumbnail oluşturulunca güncellenecek
            creator: userId,
            status: 'processing',
        });

        return await video.save();
    }

    async getVideos(page: number) {
        console.log('page', page)
        const videos = await this.videoModel
            .find({ isPublished: true, status: 'completed' })
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip(page * 10)
            .limit(10);

        return videos;
    }

    async getVideoById(videoId: string) {
        return this.videoModel
            .findById(videoId)
            .populate('creator', 'username avatar');
    }

    async updateVideo(videoId: string, updateData: Partial<Video>) {
        return this.videoModel
            .findByIdAndUpdate(videoId, updateData, { new: true });
    }

    async likeVideo(videoId: string, userId: string) {
        const video = await this.videoModel.findById(videoId);
        if (!video) {
            throw new Error('Video not found');
        }
        if (video.likedBy.includes(userId)) {
            throw new Error('Video already liked');
        }

        //if user disliked video, remove dislike
        if (video.dislikedBy.includes(userId)) {
            await this.videoModel.findByIdAndUpdate(
                videoId,
                { $pull: { dislikedBy: userId }, $inc: { dislikes: -1 } },
                { new: true }
            );
        }

        return await this.videoModel.findByIdAndUpdate(
            videoId,
            {
                $addToSet: { likedBy: userId },
                $inc: { likes: 1 },
            },
            { new: true }
        ).populate('creator');
    }

    async dislikeVideo(videoId: string, userId: string) {
        const video = await this.videoModel.findById(videoId);
        if (!video) {
            throw new Error('Video not found');
        }
        if (video.dislikedBy.includes(userId)) {
            throw new Error('Video already disliked');
        }

        //if user disliked video, remove like
        if (video.likedBy.includes(userId)) {
            await this.videoModel.findByIdAndUpdate(
                videoId,
                { $pull: { likedBy: userId }, $inc: { likes: -1 } },
                { new: true }
            );
        }
        return await this.videoModel.findByIdAndUpdate(
            videoId,
            { $addToSet: { dislikedBy: userId }, $inc: { dislikes: 1 } },
            { new: true }
        ).populate('creator');
    }

    async incrementViews(videoId: string) {
        return this.videoModel.findByIdAndUpdate(
            videoId,
            { $inc: { views: 1 } },
            { new: true }
        );
    }
} 