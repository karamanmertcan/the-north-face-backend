import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { Model } from 'mongoose';
import { AddFavoriteDto } from 'src/dtos/favorites/add-favorite.dto';

@Injectable()
export class FavoritesService {
    constructor(
        @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    ) { }

    async getFavorites(userId: string) {
        const favorites = await this.favoriteModel
            .find({
                user: userId,
            })
            .lean();

        // Process favorites to ensure they have the structure expected by FavoritesList and ProductCard
        const processedFavorites = favorites.map((favorite) => {
            // Ensure product has all required fields
            const product = favorite.product || {};

            // Get the main variant for image, price, and discount
            const mainVariant =
                product.variants && product.variants.length > 0
                    ? product.variants.find((v) => v.isActive) || product.variants[0]
                    : null;

            // Extract price and discount information
            let price = 0;
            let discountPrice = null;

            if (mainVariant) {
                // Handle different variant price structures
                if (mainVariant.price !== undefined) {
                    price = mainVariant.price;
                } else if (mainVariant.prices && mainVariant.prices.length > 0) {
                    price = mainVariant.prices[0].sellPrice || 0;
                }

                if (mainVariant.compareAtPrice !== undefined) {
                    discountPrice = mainVariant.compareAtPrice;
                } else if (mainVariant.prices && mainVariant.prices.length > 0) {
                    discountPrice = mainVariant.prices[0].discountPrice || null;
                }
            }

            // Get the main image
            let imageId = '';
            if (mainVariant && mainVariant.images && mainVariant.images.length > 0) {
                const mainImage =
                    mainVariant.images.find((img) => img.isMain) || mainVariant.images[0];
                imageId = mainImage.imageId || '';
            } else {
                imageId = product.image || '';
            }

            // Format the product object to match what ProductCard expects
            const formattedProduct = {
                _id: product._id || favorite.productId,
                name: product.name || '',
                brandName: product.brand?.name || '',
                variants: product.variants || [],
                normalizedVariants: product.normalizedVariants || [],
                // Add these fields specifically for ProductCard
                price: price,
                discount: discountPrice,
                image: imageId,
            };

            return {
                _id: favorite._id,
                productId: favorite.productId,
                product: formattedProduct,
                brandName: product.brand?.name || '',
                isFavorite: true,
            };
        });

        return processedFavorites;
    }

    async addFavorite(addFavoriteDto: AddFavoriteDto, userId: string) {
        const { productId, product } = addFavoriteDto;

        console.log('product ===>', productId, product);

        if (await this.favoriteModel.findOne({ user: userId, productId }))
            throw new BadRequestException('Bu ürün zaten favorilerinizde mevcut');

        const favorite = await this.favoriteModel.create({
            user: userId,
            productId,
            product,
        });

        return favorite;
    }

    async removeFavorite(favoriteId: string, userId: string) {
        console.log('favoriteId', favoriteId);
        console.log('userId', userId);
        const favorite = await this.favoriteModel.findOneAndDelete({
            productId: favoriteId,
            user: userId,
        });
        console.log('favorite', favorite);
        if (!favorite) throw new NotFoundException('Favori bulunamadı');

        console.log('favorite ===> deleted', favorite);

        return favorite;
    }

    async getUserFavorites(userId: string) {
        return this.favoriteModel.find({ user: userId }).populate('product');
    }
}
