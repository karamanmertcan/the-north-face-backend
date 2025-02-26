import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getS3Config } from '../../config/s3.config';
import { MakeObjectId, ObjectId } from 'src/pipes/parse-object-id.pipe';
import { Comment, CommentDocument } from 'src/schemas/comment.schema';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { LikeVideo, LikeVideoDocument } from 'src/schemas/like-video.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  FollowersFollowings,
  FollowersFollowingsDocument,
} from 'src/schemas/followers-followings.schema';

const S3_BUCKET_NAME = 'thenorthfacehikie';
const S3_DOMAIN = `https://${S3_BUCKET_NAME}.s3.amazonaws.com`;

@Injectable()
export class VideoService {
  private s3Client: S3Client;
  private readonly uploadDir = 'uploads/thumbnails';

  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private configService: ConfigService,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(LikeVideo.name)
    private likeVideoModel: Model<LikeVideoDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(FollowersFollowings.name)
    private followersFollowingsModel: Model<FollowersFollowingsDocument>,
  ) {
    this.s3Client = getS3Config(configService);
    // Uploads klasörünü oluştur
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    // ffmpeg path'ini set et
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }

  private async saveBufferToTemp(
    buffer: Buffer,
    originalname: string,
  ): Promise<string> {
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
          size: '500x240',
        })
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  getVideoUrl(filename: string): string {
    return `${S3_DOMAIN}/videos/${filename}`;
  }

  async uploadVideo(
    file: Express.Multer.File,
    caption: string,
    userId: string,
  ) {
    let tempVideoPath = null;
    try {
      console.log('Starting video upload process');

      // Önce buffer'ı geçici dosyaya kaydet
      tempVideoPath = await this.saveBufferToTemp(
        file.buffer,
        file.originalname,
      );
      console.log('Temporary file saved:', tempVideoPath);

      const fileName = `${Date.now()}-${file.originalname}`;
      const bucketName = this.configService.get('AWS_BUCKET_NAME');

      console.log('Uploading to S3:', {
        bucket: bucketName,
        fileName: fileName,
        fileSize: file.buffer.length,
      });

      // S3'e video yükle
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `videos/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }),
      );

      console.log('Video uploaded to S3');

      // Thumbnail oluştur
      console.log('Generating thumbnail');
      const thumbnailPath = await this.generateThumbnail(tempVideoPath);
      console.log('Thumbnail generated:', thumbnailPath);

      // Video kaydını oluştur
      const video = new this.videoModel({
        title: file.originalname,
        description: caption,
        videoUrl: this.getVideoUrl(fileName),
        thumbnailUrl: `/thumbnails/${path.basename(thumbnailPath)}`,
        creator: userId,
        status: 'active',
        createdAt: new Date(),
        likes: 0,
        dislikes: 0,
        views: 0,
      });

      const savedVideo = await video.save();
      console.log('Video record saved to database:', savedVideo._id);

      // Geçici dosyaları temizle
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        console.log('Temporary files cleaned up');
      }

      return savedVideo;
    } catch (error) {
      console.error('Error in uploadVideo:', error);

      // Geçici dosyaları temizle
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        console.log('Cleaned up temporary files after error');
      }

      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  async getVideos(page: number, limit: number = 5, userId?: string) {
    try {
      const videos = await this.videoModel
        .find({
          isReported: false,
        })
        .populate('creator')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean();

      // Her video için yorum sayısını ve following durumunu hesapla
      const videosWithDetails = await Promise.all(
        videos.map(async (video) => {
          console.log(userId, video.creator._id);

          const [commentsCount, isFollowing] = await Promise.all([
            this.commentModel.countDocuments({
              video: video._id,
            }),
            userId
              ? this.followersFollowingsModel.exists({
                follower: userId,
                following: video.creator._id,
              })
              : Promise.resolve(false),
          ]);

          return {
            ...video,
            commentsCount,
            isFollowing: !!isFollowing,
          };
        }),
      );

      return videosWithDetails;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  async getVideoById(videoId: ObjectId) {
    const video = await this.videoModel
      .findById(videoId)
      .populate('creator')
      .select('-password');

    console.log('vide 2o', video);
    return video;
  }

  async updateVideo(videoId: string, updateData: Partial<Video>) {
    return this.videoModel.findByIdAndUpdate(videoId, updateData, {
      new: true,
    });
  }

  async likeVideo(videoId: string, userId: string) {
    console.log('likeVideo', videoId, userId);
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
        { new: true },
      );
    }

    const likeVideo = await this.likeVideoModel.create({
      video: videoId,
      user: userId,
    });

    await likeVideo.save();

    return await this.videoModel
      .findByIdAndUpdate(
        videoId,
        {
          $addToSet: { likedBy: userId },
          $inc: { likes: 1 },
        },
        { new: true },
      )
      .populate('creator');
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
        { new: true },
      );
    }
    return await this.videoModel
      .findByIdAndUpdate(
        videoId,
        { $addToSet: { dislikedBy: userId }, $inc: { dislikes: 1 } },
        { new: true },
      )
      .populate('creator');
  }

  async incrementViews(videoId: string) {
    return this.videoModel.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true },
    );
  }

  async getLatestVideos(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const videos = await this.videoModel
        .find({
          isPublished: true,
          isReported: false, // Reported videoları filtreleme
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'creator',
          select: 'firstName lastName username avatar',
        })
        .populate('likes')
        .exec();

      if (!videos) {
        throw new Error('No videos found');
      }

      const totalVideos = await this.videoModel.countDocuments({
        isPublished: true,
      });

      // Log response for debugging
      console.log('Latest videos response:', {
        videosCount: videos.length,
        totalVideos,
        currentPage: page,
        hasMore: page < Math.ceil(totalVideos / limit),
      });

      return {
        videos,
        totalPages: Math.ceil(totalVideos / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalVideos / limit),
      };
    } catch (error) {
      console.error('Error in getLatestVideos:', error);
      throw new Error(`Failed to fetch latest videos: ${error.message}`);
    }
  }

  async deleteVideo(videoId: string, userId: string) {
    const video = await this.videoModel.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    console.log('owner', video.creator._id.toString(), userId);

    if (video.creator._id.toString() !== userId.toString()) {
      throw new Error('You are not the creator of this video');
    }

    console.log(
      'video.videoUrl',
      video.videoUrl.split('s3.amazonaws.com/videos/').pop(),
    );

    // //delete video from s3
    // await this.s3Client.send(
    //     new DeleteObjectCommand({
    //         Bucket: this.configService.get('AWS_BUCKET_NAME'),
    //         Key: `${video.videoUrl.split('s3.amazonaws.com/videos/').pop()}`,
    //     })
    // );

    //delete video from database
    await this.videoModel.findByIdAndDelete(videoId);

    return {
      message: 'Video deleted successfully',
    };
  }


  async getUserVideos(userId: string) {
    return this.videoModel.find({ creator: userId }).populate('creator');
  }
}
