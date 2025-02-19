import { CommentsService } from './comments.service';


import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  @Post('video/:videoId')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('videoId') videoId: string,
    @CurrentUser() currentUser,
    @Body('content') content: string,
  ) {
    return this.commentsService.createComment(videoId, currentUser._id, content);
  }

  @Post('video/:videoId/reply/:commentId')
  @UseGuards(JwtAuthGuard)
  async createReply(
    @Param('videoId') videoId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() currentUser,
    @Body('content') content: string,
  ) {
    return this.commentsService.createReply(videoId, currentUser._id, content, commentId);
  }

  @Get('video/:videoId')
  async getVideoComments(@Param('videoId') videoId: string) {
    return this.commentsService.getVideoComments(videoId);
  }

  @Put(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeComment(
    @Param('id') id: string,
    @CurrentUser() currentUser,
  ) {
    return this.commentsService.likeComment(id, currentUser._id);
  }

  @Put(':id/dislike')
  @UseGuards(JwtAuthGuard)
  async dislikeComment(
    @Param('id') id: string,
    @CurrentUser() currentUser,
  ) {
    return this.commentsService.dislikeComment(id, currentUser._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('video/:videoId/count')
  async getCommentsCount(@Param('videoId') videoId: string) {
    return this.commentsService.getCommentsCount(videoId);
  }
} 