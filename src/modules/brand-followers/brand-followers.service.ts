import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FollowBrandDto } from '../../dtos/brand-followers/follow-brand.dto';
import { BrandFollowers, BrandFollowersDocument } from '../../schemas/brand-followers.schema';
import { Brand, BrandDocument } from '../../schemas/brand.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { BrandsService } from '../brands/brands.service';

export interface BrandActivity {
    _id: string;
    brandId: string;
    brandName: string;
    brandLogo: string;
    description: string;
    activityType: 'product_added' | 'price_update' | 'discount_added';
    timestamp: string;
    items: Array<{
        _id: string;
        name: string;
        image: string;
        price: number;
        discount: number;
        isFavorite: boolean;
    }>;
}

@Injectable()
export class BrandFollowersService {
    constructor(
        @InjectModel(BrandFollowers.name)
        private brandFollowersModel: Model<BrandFollowersDocument>,
        @InjectModel(Brand.name)
        private brandModel: Model<BrandDocument>,
        @InjectModel(Product.name)
        private productModel: Model<ProductDocument>,
        private brandsService: BrandsService
    ) { }

    async followBrand(followBrandDto: FollowBrandDto, userId: string) {
        const { brandId } = followBrandDto;

        // Check if brand exists
        const brand = await this.brandModel.findById(brandId);
        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        // Check if already following
        const existingFollow = await this.brandFollowersModel.findOne({
            user: userId,
            brand: brandId,
        });

        if (existingFollow) {
            throw new BadRequestException('You are already following this brand');
        }

        // Create new follow relationship
        const newBrandFollow = new this.brandFollowersModel({
            user: userId,
            brand: brandId,
        });

        return newBrandFollow.save();
    }

    async unfollowBrand(followBrandDto: FollowBrandDto, userId: string) {
        const { brandId } = followBrandDto;

        // Check if brand exists
        const brand = await this.brandModel.findById(brandId);
        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        // Check if currently following
        const existingFollow = await this.brandFollowersModel.findOne({
            user: userId,
            brand: brandId,
        });

        if (!existingFollow) {
            throw new BadRequestException('You are not following this brand');
        }

        // Remove follow relationship
        return this.brandFollowersModel.deleteOne({
            user: userId,
            brand: brandId,
        });
    }

    async isFollowingBrand(brandId: string, userId: string) {
        const existingFollow = await this.brandFollowersModel.findOne({
            user: userId,
            brand: brandId,
        });

        return !!existingFollow;
    }

    async getBrandFollowers(brandId: string) {
        // Check if brand exists
        const brand = await this.brandModel.findById(brandId);
        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        // Get all followers for this brand
        return this.brandFollowersModel
            .find({ brand: brandId })
            .populate('user', '-password')
            .lean();
    }

    async getUserFollowedBrands(userId: string) {
        // Get all brands followed by this user
        const followedBrands = await this.brandFollowersModel
            .find({ user: userId })
            .populate('brand')
            .lean();

        return followedBrands.map(follow => follow.brand);
    }

    async getFollowedBrandsActivities(userId: string): Promise<BrandActivity[]> {
        // Get all brands followed by this user
        const followedBrands = await this.brandFollowersModel
            .find({ user: userId })
            .populate('brand')
            .lean();

        if (!followedBrands.length) {
            return [];
        }

        // For each brand, find most recent products (created in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activities: BrandActivity[] = [];

        for (const brandInfo of followedBrands) {
            const brand = brandInfo.brand as any; // Type assertion to fix errors
            console.log('brand ===> ', brand);
            // Find the most recent products for this brand, created in the last 30 days
            const recentProducts = await this.productModel
                .find({
                    brandId: brand.ikasId,
                    createdAt: { $gte: thirtyDaysAgo }
                })
                .sort({ createdAt: -1 })  // Sort by most recent first
                .limit(10)
                .lean();

            if (recentProducts.length > 0) {
                // Group products by day (to create activity groups)
                const productsByDay: Record<string, { date: Date, products: any[] }> = {};

                for (const product of recentProducts) {
                    const date = new Date(product.createdAt).toDateString();

                    if (!productsByDay[date]) {
                        productsByDay[date] = {
                            date: new Date(product.createdAt),
                            products: []
                        };
                    }

                    productsByDay[date].products.push(product);
                }

                // Create activity objects for each day
                for (const [date, data] of Object.entries(productsByDay)) {
                    // Get product details with favorites status
                    const processedProducts = await Promise.all(
                        data.products.map(async (product) => {
                            const mainVariant = product.variants?.find(v => v.isActive) || product.variants?.[0];
                            const mainImage = mainVariant?.images?.[0];

                            return {
                                _id: product._id.toString(),
                                name: product.name,
                                image: mainImage?.imageId,
                                price: mainVariant?.price || 0,
                                discount: mainVariant?.compareAtPrice || 0,
                                isFavorite: false  // This will be updated from frontend
                            };
                        })
                    );

                    activities.push({
                        _id: `${brand._id.toString()}`,
                        brandId: brand._id.toString(),
                        brandName: brand.name,
                        description: brand.description,
                        brandLogo: brand.imageId ? `https://cdn.myikas.com/images/f9291f47-d657-4569-9a4e-e2f64abed207/${brand.imageId}/image_720.webp` : null,
                        activityType: 'product_added',
                        timestamp: data.date.toISOString(),
                        items: processedProducts
                    });
                }
            }
        }

        // Sort all activities by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return activities;
    }
} 