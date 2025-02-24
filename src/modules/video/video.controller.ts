import { Controller, Post, Get, Put, Param, Body, UseInterceptors, UploadedFile, Query, UseGuards, ParseIntPipe, BadRequestException, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';
import { ObjectId, ParseObjectIdPipe } from 'src/pipes/parse-object-id.pipe';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('videos')
export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('video', {
        fileFilter: (req, file, callback) => {
            console.log('Received file:', file);

            // İzin verilen MIME tipleri
            const allowedMimeTypes = [
                'video/mp4',
                'video/quicktime', // .mov dosyaları için
                'video/x-msvideo', // .avi dosyaları için
            ];

            if (!allowedMimeTypes.includes(file.mimetype)) {
                return callback(
                    new BadRequestException(
                        `Unsupported file type ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
                    ),
                    false
                );
            }
            callback(null, true);
        },
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB
        }
    }))
    async uploadVideo(
        @UploadedFile() file: Express.Multer.File,
        @Body('caption') caption: string,
        @CurrentUser() currentUser,
    ) {
        if (!file) {
            throw new BadRequestException('Video file is required');
        }

        if (!caption) {
            throw new BadRequestException('Caption is required');
        }

        console.log('Received upload request:', {
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            caption,
            userId: currentUser._id
        });

        try {
            const result = await this.videoService.uploadVideo(file, caption, currentUser._id);
            return result;
        } catch (error) {
            console.error('Upload error in controller:', error);
            throw error;
        }
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getVideos(
        @Query('page', ParseIntPipe) page: number,
        @CurrentUser() currentUser,
    ) {
        console.log(page);
        return this.videoService.getVideos(page, 20, currentUser._id);
    }

    @Get('single/:id')
    async getVideo(@Param('id', new ParseObjectIdPipe()) id: ObjectId) {
        console.log('id', id)
        return this.videoService.getVideoById(id);
    }

    @Get('latest')
    @UseGuards(JwtAuthGuard)
    async getLatestVideos(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        return this.videoService.getLatestVideos(page, limit);
    }

    @Put(':id/like')
    @UseGuards(JwtAuthGuard)
    async likeVideo(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ) {
        return this.videoService.likeVideo(id, currentUser._id);
    }

    @Put(':id/dislike')
    @UseGuards(JwtAuthGuard)
    async dislikeVideo(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ) {
        return this.videoService.dislikeVideo(id, currentUser._id);
    }


    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteVideo(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ) {
        console.log('id', id)
        return this.videoService.deleteVideo(id, currentUser._id);
    }
} 