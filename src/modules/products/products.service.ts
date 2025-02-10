import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { Model } from 'mongoose';

@Injectable()
export class ProductsService {
    constructor(
        private ikasService: IkasService,
        @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>
    ) { }

    async getProducts(page: number = 1, limit: number = 10) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                    listProduct(
                        pagination: {
                            page: ${page},
                            limit: ${limit}
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
            console.error('Ürün listesi alma hatası:', error);
            throw error;
        }
    }

    async getProductById(id: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                    listProduct(id: { eq: "${id}" }) {
                        data {
                            id
                            name
                            vendorId
                            brand {
                                id
                                name
                            }
                            brandId
                            shortDescription
                            description
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
                        }
                        
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

            console.log('response detail', response.data.data.listProduct.data[0])

            const data = response.data.data.listProduct.data[0]

            const findProductIsFavorite = await this.favoriteModel.findOne({ productId: data.id })

            return {
                ...data,
                isFavorite: findProductIsFavorite ? true : false
            }
        } catch (error) {
            console.error('Ürün detayı alma hatası:', error);
            throw error;
        }
    }

    async getCategories() {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
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

            // PRODUCT_TAG condition'ı olan VE name'inde Driven34 GEÇMEyen kategorileri filtrele
            const filteredCategories = response.data.data.listCategory.filter(category => {
                // Önce conditions array'inin varlığını kontrol et
                if (!category.conditions || !Array.isArray(category.conditions)) {
                    return false;
                }

                // İsminde Driven34 geçiyorsa filtrele
                if (category.name.includes('Driven34')) {
                    return false;
                }

                return category.conditions.some(condition => condition.conditionType === 'PRODUCT_TAG');
            });

            return {
                data: {
                    listCategory: filteredCategories
                }
            };
        } catch (error) {
            console.error('Kategori listesi alma hatası:', error);
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
}
