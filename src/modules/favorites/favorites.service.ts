import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';

import { Model } from 'mongoose';
import { AddFavoriteDto } from 'src/dtos/favorites/add-favorite.dto';
import { ObjectId } from 'src/pipes/parse-object-id.pipe';

@Injectable()
export class FavoritesService {

    constructor(
        @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>
    ) { }

    async getFavorites(userId: string) {
        const favorites = await this.favoriteModel.find({
            user: userId
        }).lean();

        console.log('favorites mertcan', favorites)

        return favorites;
    }

    async addFavorite(addFavoriteDto: AddFavoriteDto, userId: string) {
        const { productId, product } = addFavoriteDto;

        console.log('product ===>', productId, product)

        if (await this.favoriteModel.findOne({ user: userId, productId }))
            throw new BadRequestException('Bu ürün zaten favorilerinizde mevcut');


        const favorite = await this.favoriteModel.create({
            user: userId,
            productId,
            product
        });

        return favorite;
    }

    async removeFavorite(favoriteId: string, userId: string) {
        console.log('favoriteId', favoriteId)
        console.log('userId', userId)
        const favorite = await this.favoriteModel.findOneAndDelete({ productId: favoriteId, user: userId });
        console.log('favorite', favorite)
        if (!favorite)
            throw new NotFoundException('Favori bulunamadı');

        console.log('favorite ===> deleted', favorite)

        return favorite;
    }
}
