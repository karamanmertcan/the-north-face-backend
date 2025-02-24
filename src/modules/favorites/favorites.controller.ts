import { Body, Controller, Post, UseGuards, Get, Delete, Param } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AddFavoriteDto } from 'src/dtos/favorites/add-favorite.dto';
import { CurrentUser } from 'src/decorators/current-user';
import { ObjectId } from 'src/pipes/parse-object-id.pipe';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  addFavorite(@CurrentUser() currentUser, @Body() addFavoriteDto: AddFavoriteDto) {
    return this.favoritesService.addFavorite(addFavoriteDto, currentUser._id);
  }


  @UseGuards(JwtAuthGuard)
  @Get()
  getFavorites(@CurrentUser() currentUser) {
    return this.favoritesService.getFavorites(currentUser._id);
  }


  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeFavorite(@CurrentUser() currentUser, @Param('id') id: string) {
    console.log('favorite remove id ===>', id)
    return this.favoritesService.removeFavorite(id, currentUser._id);
  }
}
