import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from 'src/decorators/current-user';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }


  @UseGuards(JwtAuthGuard)
  @Get()
  getUser(@CurrentUser() user) {
    return this.usersService.getUser(user._id);
  }


  @UseGuards(JwtAuthGuard)
  @Get('videos')
  getUserVideos(@CurrentUser() user) {
    return this.usersService.getUserVideos(user._id);
  }


}
