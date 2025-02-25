import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LikedVideosService } from './liked-videos.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@Controller('liked-videos')
export class LikedVideosController {
  constructor(private readonly likedVideosService: LikedVideosService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getLikedVideos(@CurrentUser() currentUser) {
    return this.likedVideosService.getLikedVideos(currentUser._id);
  }
}
