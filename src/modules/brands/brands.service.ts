import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { ProductsService } from '../products/products.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from 'src/schemas/product.schema';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { THE_NORTH_FACE_CHANNEL_ID } from 'src/utils/constants';

@Injectable()
export class BrandsService {
  constructor(
    private ikasService: IkasService,
    private productsService: ProductsService,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
  ) {}

  async getBrands(page: number = 1, limit: number = 10) {
    try {
      const accessToken = await this.ikasService.getAccessToken();

      const query = `
                query {
                    listProductBrand {
                       
                        id
                        name
                        description
                        imageId
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
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.data.listProductBrand;
    } catch (error) {
      console.error('Marka listesi alma hatası:', error);
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
          eq: brandId,
        },
      };

      const response = await axios.post(
        'https://api.myikas.com/api/v1/admin/graphql',
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
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
                        productVariantTypes {
                            variantTypeId
                            variantValueIds
                        }
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
          eq: brandId,
        },
      };

      const response = await axios.post(
        'https://api.myikas.com/api/v1/admin/graphql',
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Process products to include normalized variants
      const productsData = response.data.data.listProduct.data;
      const processedProducts = await Promise.all(
        productsData.map(async (productData: any) => {
          // Convert IKAS product to our MongoDB schema format
          const productToSave = {
            ikasProductId: productData.id,
            name: productData.name,
            vendorId: productData.vendorId,
            categories: productData.categories,
            productVariantTypes: productData.productVariantTypes || [],
            brand: productData.brand,
            brandId: productData.brandId,
            tags: productData.tags,
            description: productData.description,
            variants: productData.variants.map((variant: any) => ({
              id: variant.id,
              sku: variant.sku,
              isActive: variant.isActive,
              price: variant.prices[0]?.sellPrice || 0,
              compareAtPrice: variant.prices[0]?.discountPrice || null,
              weight: variant.weight,
              images: variant.images.map((img: any) => ({
                imageId: img.imageId,
                isMain: img.isMain,
              })),
            })),
          };

          // Find or create the product in MongoDB
          let dbProduct = await this.productModel.findOne({
            ikasProductId: productData.id,
          });
          if (!dbProduct) {
            dbProduct = await this.productModel.create(productToSave);
          }

          // Get normalized variants using the ProductsService
          const normalizedVariants =
            await this.productsService.normalizeProductVariants(
              dbProduct,
              accessToken,
            );

          const mainVariant =
            productData.variants?.find((v: any) => v.isActive) ||
            productData.variants?.[0];
          const price = mainVariant?.prices[0]?.sellPrice;
          const discountPrice = mainVariant?.prices[0]?.discountPrice;
          const mainImage =
            mainVariant?.images?.find((img: any) => img.isMain) ||
            mainVariant?.images?.[0];

          // Check if product is in favorites
          const findProductIsFavorite = await this.favoriteModel.findOne({
            productId: productData.id,
          });

          return {
            _id: productData.id,
            name: productData.name,
            brandName: productData.brand?.name || '',
            image: mainImage?.imageId,
            price: price || 0,
            discount: discountPrice || null,
            variants: productData.variants || [],
            normalizedVariants,
            isFavorite: findProductIsFavorite ? true : false,
          };
        }),
      );

      return {
        ...response.data.data.listProduct,
        data: processedProducts,
      };
    } catch (error) {
      console.error('Marka ürünleri listesi alma hatası:', error);
      throw error;
    }
  }
}
