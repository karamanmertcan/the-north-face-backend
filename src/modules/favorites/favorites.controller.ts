import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AddFavoriteDto } from 'src/dtos/favorites/add-favorite.dto';
import { CurrentUser } from 'src/decorators/current-user';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) { }

  @ApiOperation({
    summary: 'Add favorite',
    description: 'Add a product to user favorites',
  })
  @ApiResponse({
    status: 201,
    description: 'Product added to favorites successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Product already in favorites',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not authenticated',
  })
  @ApiBody({ type: AddFavoriteDto })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post()
  addFavorite(
    @CurrentUser() currentUser,
    @Body() addFavoriteDto: AddFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(addFavoriteDto, currentUser._id);
  }

  @ApiOperation({
    summary: 'Get favorites',
    description: 'Get all favorites for the current user',
  })
  @ApiResponse({ status: 200, description: 'Returns list of user favorites' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not authenticated',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get()
  getFavorites(@CurrentUser() currentUser) {
    return this.favoritesService.getFavorites(currentUser._id);
  }

  @ApiOperation({
    summary: 'Remove favorite',
    description: 'Remove a product from user favorites',
  })
  @ApiResponse({
    status: 200,
    description: 'Product removed from favorites successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Favorite not found' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not authenticated',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID to remove from favorites',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeFavorite(@CurrentUser() currentUser, @Param('id') id: string) {
    console.log('favorite remove id ===>', id);
    return this.favoritesService.removeFavorite(id, currentUser._id);
  }

  @ApiOperation({
    summary: 'Get favorites by user',
    description: 'Get all favorites for a specific user',
  })
  @ApiResponse({ status: 200, description: 'Returns list of user favorites' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('user')
  getUserFavorites(@CurrentUser() currentUser) {
    return this.favoritesService.getUserFavorites(currentUser._id);
  }
}

