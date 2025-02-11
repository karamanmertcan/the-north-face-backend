import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from 'src/services/ikas.service';
import { THE_NORTH_FACE_CHANNEL_ID } from 'src/utils/constants';

@Injectable()
export class BrandsService {
    constructor(
        private ikasService: IkasService
    ) { }

    async getBrands(page: number = 1, limit: number = 10) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                   listProductBrand {
                    id
                    name
                    createdAt
                    imageId
                    description
                    salesChannelIds
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

            console.log('Brands length', response.data.data.listProductBrand.length);

            const data = response.data.data.listProductBrand;


            const filterBrandByChannelId = data.filter((brand: any) => brand.salesChannelIds.includes(THE_NORTH_FACE_CHANNEL_ID));

            console.log('filterBrandByChannelId', filterBrandByChannelId.length);
            return filterBrandByChannelId;
        } catch (error) {
            console.error('Ürün listesi alma hatası:', error);
            throw error;
        }
    }


    async getBrandProducts(brandId: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
            query ListProductBrand($listProductBrandId: StringFilterInput) {
                listProductBrand(id: $listProductBrandId) {
                    createdAt
                    deleted
                    description
                    id
                    imageId
                    name
                    orderType
                    salesChannelIds
                    updatedAt
                }
            }
        `;

            const variables = {
                listProductBrandId: {
                    eq: brandId
                }
            };

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                {
                    query,
                    variables
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            return response.data.data.listProductBrand;
        } catch (error) {
            console.error('Ürün listesi alma hatası:', error);
            throw error;
        }
    }


    async getProductsByBrand(brandId: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
            query ListProduct($brandId: StringFilterInput) {
                listProduct(brandId: $brandId) {
                    count
                    data {
                        brand {
                            createdAt
                            deleted
                            id
                            name
                            updatedAt
                        }
                        categories {
                            createdAt
                            deleted
                            id
                            name
                            parentId
                            updatedAt
                        }
                        description
                        createdAt
                        brandId
                        name
                        id
                        hiddenSalesChannelIds
                        shortDescription
                        tags {
                            createdAt
                            deleted
                            id
                            name
                            updatedAt
                        }
                        variants {
                            barcodeList
                            createdAt
                            deleted
                            fileId
                            hsCode
                            id
                            images {
                                fileName
                                imageId
                                isMain
                                isVideo
                                order
                            }
                            isActive
                            prices {
                                buyPrice
                                currency
                                currencyCode
                                currencySymbol
                                discountPrice
                                sellPrice
                            }
                            sellIfOutOfStock
                            sku
                            subscriptionPlanId
                            unit {
                                amount
                                type
                            }
                            updatedAt
                            weight
                        }
                        updatedAt
                        totalStock
                    }
                    hasNext
                    limit
                    page
                }
            }
        `;

            const variables = {
                brandId: {
                    eq: brandId
                }
            };

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                {
                    query,
                    variables
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            return response.data.data.listProduct;
        } catch (error) {
            console.error('Marka ürünleri listesi alma hatası:', error);
            throw error;
        }
    }
}
