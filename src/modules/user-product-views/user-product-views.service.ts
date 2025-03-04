import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProductView } from './schemas/user-product-view.schema';
import { TrackProductViewDto, InteractionType } from './dto/track-product-view.dto';

@Injectable()
export class UserProductViewsService {
    private readonly logger = new Logger(UserProductViewsService.name);

    constructor(
        @InjectModel(UserProductView.name)
        private readonly userProductViewModel: Model<UserProductView>,
    ) { }

    /**
     * Kullanıcının ürün görüntüleme kaydını ekler veya günceller
     * @param userId Kullanıcı ID
     * @param productData Ürün verileri
     * @param interactionType Etkileşim türü (view, cart, favorite, purchase)
     * @param viewDuration Görüntüleme süresi (saniye)
     */
    async trackProductView(
        userId: string,
        productData: TrackProductViewDto,
        interactionType: InteractionType = InteractionType.VIEW,
        viewDuration: number = 0,
    ): Promise<UserProductView> {
        try {
            // Check if there's an existing record for this user and product
            const existingRecord = await this.userProductViewModel.findOne({
                userId,
                productId: productData.productId.toString(),
            });

            if (existingRecord) {
                // Update existing record
                existingRecord.viewCount += 1;
                existingRecord.totalViewDuration += viewDuration || 0;
                existingRecord.lastViewedAt = new Date();
                existingRecord.interactionType = interactionType;

                // Update product data if provided
                if (productData.image) existingRecord.image = productData.image;
                if (productData.price) existingRecord.price = productData.price;
                if (productData.discount) existingRecord.discount = productData.discount;

                return existingRecord.save();
            } else {
                // Create new record
                return this.userProductViewModel.create({
                    userId,
                    productId: productData.productId.toString(),
                    productName: productData.productName,
                    brandName: productData.brandName,
                    image: productData.image,
                    price: productData.price,
                    discount: productData.discount,
                    interactionType,
                    viewCount: 1,
                    totalViewDuration: viewDuration || 0,
                    lastViewedAt: new Date(),
                });
            }
        } catch (error) {
            this.logger.error(`Error tracking product view: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Kullanıcının son görüntülediği ürünleri getirir
     * @param userId Kullanıcı ID
     * @param limit Maksimum kayıt sayısı
     */
    async getRecentlyViewedProducts(
        userId: string,
        limit: number = 10,
    ): Promise<UserProductView[]> {
        try {
            return this.userProductViewModel
                .find({ userId })
                .sort({ lastViewedAt: -1 })
                .limit(limit)
                .exec();
        } catch (error) {
            this.logger.error(`Error getting recently viewed products: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Kullanıcının en çok görüntülediği ürünleri getirir
     * @param userId Kullanıcı ID
     * @param limit Maksimum kayıt sayısı
     */
    async getMostViewedProducts(
        userId: string,
        limit: number = 10,
    ): Promise<UserProductView[]> {
        try {
            return this.userProductViewModel
                .find({ userId })
                .sort({ viewCount: -1 })
                .limit(limit)
                .exec();
        } catch (error) {
            this.logger.error(`Error getting most viewed products: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Kullanıcının belirli bir etkileşim türüne göre ürünlerini getirir
     * @param userId Kullanıcı ID
     * @param interactionType Etkileşim türü (view, cart, favorite, purchase)
     * @param limit Maksimum kayıt sayısı
     */
    async getProductsByInteractionType(
        userId: string,
        interactionType: InteractionType,
        limit: number = 10,
    ): Promise<UserProductView[]> {
        try {
            return this.userProductViewModel
                .find({ userId, interactionType })
                .sort({ lastViewedAt: -1 })
                .limit(limit)
                .exec();
        } catch (error) {
            this.logger.error(`Error getting products by interaction type: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Kullanıcının ürün görüntüleme geçmişini temizler
     * @param userId Kullanıcı ID
     */
    async clearViewHistory(userId: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
        try {
            const result = await this.userProductViewModel.deleteMany({ userId }).exec();
            return {
                acknowledged: result.acknowledged,
                deletedCount: result.deletedCount,
            };
        } catch (error) {
            this.logger.error(`Error clearing view history: ${error.message}`, error.stack);
            throw error;
        }
    }
} 