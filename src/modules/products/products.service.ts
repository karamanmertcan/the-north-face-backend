import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { Model } from 'mongoose';
import { Product, ProductDocument } from 'src/schemas/product.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ProductsService {
    constructor(
        private ikasService: IkasService,
        @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>
    ) { }

    @Cron(CronExpression.EVERY_6_HOURS)
    async syncProducts() {
        try {
            console.log('Starting product sync...');
            let page = 1;
            let hasNext = true;

            while (hasNext) {
                const response = await this.ikasService.makeRequest(
                    `query {
                        listProduct(
                            pagination: {
                                page: ${page}
                            }
                        ) {
                            data {
                                id
                                name
                                vendorId
                                categories {
                                    id
                                    name
                                    parentId
                                }
                                productVariantTypes {
                                    variantTypeId
                                    variantValueIds
                                }
                                brand {
                                    id
                                    name
                                }
                                brandId
                                tags{
                                    id
                                    name
                                }
                                variants {
                                    id
                                    sku
                                    isActive
                                    weight
                                    images {
                                        fileName
                                        isMain
                                        order
                                        isVideo
                                        imageId
                                    }
                                    prices {
                                        sellPrice
                                        discountPrice
                                        currency
                                    }
                                }
                                createdAt
                            }
                            count
                            hasNext
                            limit
                            page
                        }
                    }`
                );

                console.log(response.data.data.listProduct.data.map((product: any) => ({
                    ikasProductId: product.id,
                    name: product.name,
                    vendorId: product.vendorId,
                    categories: product.categories,
                    productVariantTypes: product.productVariantTypes,
                    brand: product.brand,
                    brandId: product.brandId,
                    tags: product.tags,
                    variants: product.variants.map((variant: any) => ({
                        id: variant.id,
                        sku: variant.sku,
                        isActive: variant.isActive,
                        price: variant.prices.find((p: any) => p.currency === 'TRY')?.sellPrice || 0,
                        compareAtPrice: variant.prices.find((p: any) => p.currency === 'TRY')?.discountPrice,
                        weight: variant.weight,
                        stockAmount: variant.stockAmount || 0,
                        images: variant.images.map((img: any) => ({
                            imageId: img.imageId,
                            isMain: img.isMain
                        })),
                        values: variant.values || []
                    }))
                })))

                const products = response.data.data.listProduct.data.map((product: any) => ({
                    ikasProductId: product.id,
                    name: product.name,
                    vendorId: product.vendorId,
                    categories: product.categories,
                    productVariantTypes: product.productVariantTypes,
                    brand: product.brand,
                    brandId: product.brandId,
                    tags: product.tags,
                    variants: product.variants.map((variant: any) => ({
                        id: variant.id,
                        sku: variant.sku,
                        isActive: variant.isActive,
                        price: variant.prices[0]?.sellPrice || 0,
                        compareAtPrice: variant.prices[0]?.discountPrice || null,
                        weight: variant.weight,
                        stockAmount: variant.stockAmount || 0,
                        images: variant.images.map((img: any) => ({
                            imageId: img.imageId,
                            isMain: img.isMain
                        })),
                        values: variant.values || []
                    }))
                }));

                hasNext = response.data.data.listProduct.hasNext;

                for (const product of products) {
                    await this.productModel.findOneAndUpdate(
                        { ikasProductId: product.ikasProductId },
                        product,
                        { upsert: true, new: true }
                    );
                }

                console.log(`Synced page ${page}`);
                page++;

                // Rate limiting - her sayfa arasında 1 saniye bekle
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('Product sync completed successfully');
        } catch (error) {
            console.error('Error syncing products:', error);
        }
    }

    async getProducts() {
        try {
            const products = await this.productModel.find().limit(20);

            const productsWithFavorites = await Promise.all(products.map(async (product: any) => {
                const findProductIsFavorite = await this.favoriteModel.findOne({ productId: product.ikasProductId });
                const mainVariant = product.variants?.find((v: any) => v.isActive) || product.variants?.[0];
                const price = mainVariant?.price;
                const discountPrice = mainVariant?.compareAtPrice;

                return {
                    _id: product._id,
                    id: product.ikasProductId,
                    name: product.name,
                    brandName: product.brand?.name || '',
                    image: mainVariant?.images?.[0]?.imageId,
                    price: price,
                    discount: discountPrice,
                    isFavorite: findProductIsFavorite ? true : false
                };
            }));

            console.log('productsWithFavorites', productsWithFavorites);

            return {
                data: productsWithFavorites
            };
        } catch (error) {
            console.error('Error getting products:', error);
            throw error;
        }
    }

    async getProductById(id: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();
            const dbProduct: any = await this.productModel.findById({
                _id: id
            });
            if (!dbProduct) {
                throw new Error('Product not found');
            }

            // Varyant tiplerini çek
            const variantTypes = await Promise.all(
                dbProduct.productVariantTypes.map(async (variantType: any) => {
                    const variantTypeQuery = `
                        query {
                            listVariantType(id: { eq: "${variantType.variantTypeId}" }) {
                                id
                                name
                                values {
                                    id
                                    name
                                    colorCode
                                    thumbnailImageId
                                }
                            }
                        }
                    `;

                    const variantTypeResponse = await axios.post(
                        'https://api.myikas.com/api/v1/admin/graphql',
                        { query: variantTypeQuery },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`,
                            }
                        }
                    );

                    const variantTypeData = variantTypeResponse.data.data.listVariantType[0];

                    // Sadece ürünün sahip olduğu varyant değerlerini filtrele ve variant ID'lerini ekle
                    const filteredValues = variantTypeData.values
                        .filter((value: any) => variantType.variantValueIds.includes(value.id))
                        .map((value: any, index: number) => {
                            // Her değer için variants array'inden aynı indexteki variant'ı al
                            const relatedVariant = dbProduct.variants[index];

                            return {
                                id: value.id,
                                name: value.name,
                                colorCode: value.colorCode,
                                thumbnailImageId: value.thumbnailImageId,
                                parentId: relatedVariant?.id || null // Variant ID'sini parentId olarak ekle
                            };
                        });

                    return {
                        id: variantTypeData.id,
                        name: variantTypeData.name,
                        values: filteredValues
                    };
                })
            );

            const findProductIsFavorite = await this.favoriteModel.findOne({ productId: dbProduct.ikasProductId });

            // Format the response to match IKAS API structure
            const formattedProduct = {
                _id: dbProduct._id,
                id: dbProduct.ikasProductId,
                name: dbProduct.name,
                vendorId: dbProduct.vendorId,
                brand: dbProduct.brand,
                brandId: dbProduct.brandId,
                shortDescription: dbProduct.shortDescription,
                description: dbProduct.description,
                productVariantTypes: dbProduct.productVariantTypes,
                variants: dbProduct.variants.map((variant: any) => ({
                    id: variant.id,
                    sku: variant.sku,
                    isActive: variant.isActive,
                    weight: variant.weight,
                    images: variant.images,
                    prices: [{
                        sellPrice: variant.price,
                        discountPrice: variant.compareAtPrice,
                        currency: 'TRY'
                    }]
                }))
            };

            return {
                ...formattedProduct,
                normalizedVariants: variantTypes,
                isFavorite: findProductIsFavorite ? true : false
            };

        } catch (error) {
            console.error('Ürün detayı alma hatası:', error);
            throw error;
        }
    }

    async getCategories() {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                {
                    query: `
                        query {
                            listCategory {
                                id
                                name
                                imageId
                                description
                                orderType
                                isAutomated
                                conditions {
                                    conditionType
                                    valueList
                                }
                            }
                        }
                    `
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Kategori listesi alma hatası:', error);
            throw error;
        }
    }

    async searchProducts(query: string, page: number = 1, limit: number = 10) {
        try {
            const skip = (page - 1) * limit;
            const searchRegex = new RegExp(query, 'i');

            const products = await this.productModel
                .find({
                    $or: [
                        { name: searchRegex },
                        { 'brand.name': searchRegex },
                        { 'tags.name': searchRegex }
                    ]
                })
                .select('_id name brand variants')
                .skip(skip)
                .limit(limit)
                .lean()

            // Her ürün için favorite durumunu kontrol et
            const productsWithFavorites = await Promise.all(products.map(async (product) => {
                const findProductIsFavorite = await this.favoriteModel.findOne({ productId: product.id });
                const mainVariant: any = product.variants?.find((v: any) => v.isActive) || product.variants?.[0];
                const price = mainVariant?.price;
                const discountPrice = mainVariant?.compareAtPrice;

                console.log('product', product)

                return {
                    _id: product._id,
                    name: product.name,
                    brandName: product.brand?.name || '',
                    image: mainVariant?.images?.[0]?.imageId,
                    price: price,
                    discount: discountPrice,
                    isFavorite: findProductIsFavorite ? true : false
                };
            }));

            const total = await this.productModel.countDocuments({
                $or: [
                    { name: searchRegex },
                    { 'brand.name': searchRegex },
                    { 'tags.name': searchRegex }
                ]
            });

            return {
                data: {
                    listProduct: {
                        data: productsWithFavorites,
                        count: total,
                        hasNext: skip + limit < total,
                        limit,
                        page
                    }
                }
            };

        } catch (error) {
            console.error('Ürün arama hatası:', error);
            throw error;
        }
    }

    async getCategoryByOrderType(orderType: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                    listCategory(orderType: ${orderType}) {
                        id
                        name
                    }
                }
            `;

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Kategori listesi alma hatası:', error);
            throw error;
        }
    }

    async getBestSellers() {
        try {
            const products = await this.productModel
                .find()
                .sort({ soldCount: -1 })
                .limit(10)
                .populate('brand');

            const formattedProducts = products.map(product => {
                const mainVariant: any = product.variants?.find(v => v.isActive) || product.variants?.[0];
                console.log('main variant ===>', mainVariant)

                const price = mainVariant?.price;
                const discountPrice = mainVariant?.compareAtPrice;
                const mainImage = mainVariant?.images?.[0];

                return {
                    _id: product._id,
                    name: product.name,
                    brandName: product.brand?.name || '',
                    image: mainImage?.imageId,
                    price: price || 0,
                    discount: discountPrice || null,
                    variants: product.variants || []
                };
            });

            console.log('bestSellers', formattedProducts);

            return {
                success: true,
                data: formattedProducts
            };
        } catch (error) {
            console.error('Error getting best sellers:', error);
            throw new Error('Failed to get best sellers');
        }
    }

    async getCommunityProducts() {
        try {
            const products = await this.productModel
                .find()
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('brand');


            const formattedProducts = products.map(product => {
                const mainVariant: any = product.variants?.find(v => v.isActive) || product.variants?.[0];

                const price = mainVariant?.price;
                const discountPrice = mainVariant?.compareAtPrice;
                const mainImage = mainVariant?.images?.[0];

                return {
                    _id: product._id,
                    name: product.name,
                    brandName: product.brand?.name || '',
                    image: mainImage?.imageId,
                    price: price || 0,
                    discount: discountPrice || null,
                    variants: product.variants || []
                };
            })



            return {
                success: true,
                data: formattedProducts
            };
        } catch (error) {
            console.error('Error getting community products:', error);
            throw new Error('Failed to get community products');
        }
    }
}
