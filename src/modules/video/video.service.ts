import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getS3Config } from '../../config/s3.config';
import { MakeObjectId } from 'src/pipes/parse-object-id.pipe';
import { Comment, CommentDocument } from 'src/schemas/comment.schema';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

@Injectable()
export class VideoService {
    private s3Client: S3Client;
    private readonly uploadDir = 'uploads/thumbnails';

    constructor(
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        private configService: ConfigService,
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    ) {
        this.s3Client = getS3Config(configService);
        // Uploads klasörünü oluştur
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        // ffmpeg path'ini set et
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }

    private async saveBufferToTemp(buffer: Buffer, originalname: string): Promise<string> {
        const tempPath = path.join(os.tmpdir(), `${Date.now()}-${originalname}`);
        fs.writeFileSync(tempPath, buffer);
        return tempPath;
    }

    private async generateThumbnail(videoPath: string): Promise<string> {
        const thumbnailName = `${Date.now()}_thumb.jpg`;
        const thumbnailPath = path.join(this.uploadDir, thumbnailName);

        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: ['00:00:01'],
                    filename: thumbnailName,
                    folder: this.uploadDir,
                    size: '320x240'
                })
                .on('end', () => {
                    resolve(thumbnailPath);
                })
                .on('error', (err) => {
                    reject(err);
                });
        });
    }

    async uploadVideo(file: Express.Multer.File, userId: string) {
        try {
            // Önce buffer'ı geçici dosyaya kaydet
            const tempVideoPath = await this.saveBufferToTemp(file.buffer, file.originalname);

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

            // Thumbnail oluştur
            const thumbnailPath = await this.generateThumbnail(tempVideoPath);

            // Geçici video dosyasını sil
            fs.unlinkSync(tempVideoPath);

            // Video kaydını oluştur
            const video = new this.videoModel({
                title: file.originalname,
                description: 'adasdasd',
                videoUrl: `https://${bucketName}.s3.amazonaws.com/videos/${fileName}`,
                thumbnailUrl: `/thumbnails/${path.basename(thumbnailPath)}`,
                creator: userId,
                status: 'processing',
            });

            await video.save();
            return video;

        } catch (error) {
            console.error('Video upload error:', error);
            throw error;
        }
    }

    async getVideos(page: number) {
        console.log('page', page)
        const videos = await this.videoModel
            .find({ isPublished: true, status: 'completed' })
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip(page * 10)
            .limit(10)
            .lean();

        // Her video için yorum sayısını hesapla
        const videosWithCommentsCount = await Promise.all(
            videos.map(async (video) => {
                const commentsCount = await this.commentModel.countDocuments({
                    video: video._id
                });

                return {
                    ...video,
                    commentsCount
                };
            })
        );
        console.log('videosWithCommentsCount', videosWithCommentsCount)
        return videosWithCommentsCount;
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