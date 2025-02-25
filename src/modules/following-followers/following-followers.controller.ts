import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { FollowingFollowersService } from './following-followers.service';
import { FollowingFollowersDto } from 'src/dtos/following-followers/following-followers.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@Controller('following-followers')
export class FollowingFollowersController {
  constructor(
    private readonly followingFollowersService: FollowingFollowersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('follow')
  async follow(
    @Body() followingFollowersDto: FollowingFollowersDto,
    @CurrentUser() currentUser,
  ) {
    return this.followingFollowersService.follow(
      followingFollowersDto,
      currentUser._id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unfollow')
  async unfollow(
    @Body() followingFollowersDto: FollowingFollowersDto,
    @CurrentUser() currentUser,
  ) {
    return this.followingFollowersService.unfollow(
      followingFollowersDto,
      currentUser._id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  async getFollowing(@CurrentUser() currentUser) {
    return this.followingFollowersService.getFollowing(currentUser._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('followers')
  async getFollowers(@CurrentUser() currentUser) {
    return this.followingFollowersService.getFollowers(currentUser._id);
  }
}
