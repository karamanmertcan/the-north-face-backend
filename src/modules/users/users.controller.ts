import { Controller, Get, UseGuards, Post, UploadedFile, UseInterceptors, Put, Body, Param, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from 'src/decorators/current-user';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from 'src/dtos/user/update-user.dto';

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


  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getUserProfile(@CurrentUser() user) {
    return this.usersService.getUserProfileWithVideos(user._id);
  }


  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any
  ) {
    return this.usersService.updateAvatar(user._id, file);
  }


  @UseGuards(JwtAuthGuard)
  @Put('profile-update')
  updateUser(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(user._id, updateUserDto);
  }


  @UseGuards(JwtAuthGuard)
  @Get('profile/:userId')
  async getUserProfileById(
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.usersService.getUserProfileById(userId, req.user._id);
  }


}
