import { Controller, Post, Get, Put, Param, Body, UseInterceptors, UploadedFile, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';
import { ObjectId, ParseObjectIdPipe } from 'src/pipes/parse-object-id.pipe';

@Controller('videos')
export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('video'))
    async uploadVideo(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() currentUser,
    ) {
        return this.videoService.uploadVideo(file, currentUser._id);
    }

    @Get()
    async getVideos(
        @Query('page', ParseIntPipe) page: number,
    ) {
        console.log(page);
        return this.videoService.getVideos(page, 20);
    }

    @Get('single/:id')
    async getVideo(@Param('id', new ParseObjectIdPipe()) id: ObjectId) {
        console.log('id', id)
        return this.videoService.getVideoById(id);
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

} 