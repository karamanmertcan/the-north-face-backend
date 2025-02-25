import {
  Controller,
  Get,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
  Put,
  Body,
  Param,
  Request,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from 'src/decorators/current-user';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from 'src/dtos/user/update-user.dto';
import { AddressDto } from 'src/dtos/user/add-address.dto';
import { UpdateUserAddressDto } from 'src/dtos/user/update-address.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    @CurrentUser() user: any,
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
  async getUserProfileById(@Param('userId') userId: string, @Request() req) {
    return this.usersService.getUserProfileById(userId, req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  async getUserAddresses(@CurrentUser() user) {
    return this.usersService.getUserAddresses(user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  async addUserAddress(@CurrentUser() user, @Body() addressDto: AddressDto) {
    return this.usersService.addAddress(user._id, addressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('addresses/:addressId')
  async updateUserAddress(
    @CurrentUser() user,
    @Param('addressId') addressId: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    return this.usersService.updateUserAddress(
      user._id,
      addressId,
      updateUserAddressDto,
    );
  }

  @Get('countries')
  async getCountries() {
    return this.usersService.getCountries();
  }

  @Get('cities/:countryId')
  async getCities(@Param('countryId') countryId: string) {
    return this.usersService.getCities(countryId);
  }

  @Get('districts/:cityId')
  async getDistricts(@Param('cityId') cityId: string) {
    return this.usersService.getDistricts(cityId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:addressId')
  async deleteUserAddress(
    @CurrentUser() user,
    @Param('addressId') addressId: string,
  ) {
    console.log('user in controller', user);
    console.log('addressId in controller', addressId);
    return this.usersService.deleteUserAddress(user._id, addressId);
  }
}
