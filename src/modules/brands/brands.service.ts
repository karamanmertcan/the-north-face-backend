import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { ProductsService } from '../products/products.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from 'src/schemas/product.schema';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { THE_NORTH_FACE_CHANNEL_ID } from 'src/utils/constants';
import { Brand, BrandDocument } from 'src/schemas/brand.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BrandFollowers, BrandFollowersDocument } from 'src/schemas/brand-followers.schema';

@Injectable()
export class BrandsService {
  constructor(
    private ikasService: IkasService,
    private productsService: ProductsService,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    @InjectModel(BrandFollowers.name) private brandFollowersModel: Model<BrandFollowersDocument>,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncBrands() {
    try {
      const brands = await this.getBrands();
      console.log('brands ===>', brands);
      const brandIds = brands.map((brand: any) => brand.id);
      const brandsFromDb = await this.brandModel.find({ ikasId: { $in: brandIds } });
      console.log('brandsFromDb ===>', brandsFromDb);

      // Filter brands to create, update, and delete
      const brandsToCreate = brands.filter((brand: any) => !brandsFromDb.some((b: any) => b.ikasId === brand.id));
      console.log('brandsToCreate ===>', brandsToCreate);
      const brandsToUpdate = brands.filter((brand: any) => brandsFromDb.some((b: any) => b.ikasId === brand.id));
      console.log('brandsToUpdate ===>', brandsToUpdate);
      const brandsToDelete = brandsFromDb.filter((brand: any) => !brandIds.includes(brand.ikasId));
      console.log('brandsToDelete ===>', brandsToDelete);

      // Create new brands with default values for required fields
      await Promise.all(brandsToCreate.map((brand: any) => this.brandModel.create({
        name: brand.name,
        imageId: brand.imageId || 'default-image-id', // Provide default if missing
        description: brand.description || 'No description available', // Provide default if missing
        salesChannelIds: brand.salesChannelIds || [],
        ikasId: brand.id,
      })));

      // Update existing brands with explicit field updates
      await Promise.all(brandsToUpdate.map((brand: any) => {
        const updateData = {
          name: brand.name,
          imageId: brand.imageId || 'default-image-id', // Provide default if missing
          description: brand.description || 'No description available', // Provide default if missing
          salesChannelIds: brand.salesChannelIds || [],
        };
        return this.brandModel.updateOne({ ikasId: brand.id }, { $set: updateData });
      }));

      // Delete brands that no longer exist
      await Promise.all(brandsToDelete.map((brand: any) => this.brandModel.deleteOne({ _id: brand._id })));
    } catch (error) {
      console.error('Error syncing brands:', error);
    }
  }

  // New method to check if a user follows a brand
  async isUserFollowingBrand(userId: string, brandId: string): Promise<boolean> {
    if (!userId || !brandId) return false;

    const follow = await this.brandFollowersModel.findOne({
      user: userId,
      brand: brandId
    });

    return !!follow;
  }

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

      console.log('variables ===>', variables);

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

      console.log('response ===>', response.data.data.listProduct);

      // Process products to include normalized variants
      const productsData = response.data.data.listProduct.data;
      console.log('productsData ===>', productsData);
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

      console.log('processedProducts ===>', processedProducts);

      return {
        ...response.data.data.listProduct,
        data: processedProducts,
      };
    } catch (error) {
      console.error('Marka ürünleri listesi alma hatası:', error);
      throw error;
    }
  }

  // Modified method to include isFollowing information
  async getBrandsWithProducts(limit: number = 4, userId: string) {
    try {
      // Get brands from IKAS
      const brands = await this.getBrands();

      // Process brands to include image URLs and add rating
      const processedBrands = await Promise.all(
        brands.map(async (brand: any) => {
          // Get products for this brand from our database
          const products = await this.productModel
            .find({ brandId: brand.id })
            .limit(limit)
            .lean();

          // Find the corresponding MongoDB brand document
          const dbBrand = await this.brandModel.findOne({ ikasId: brand.id });

          // Check if user is following this brand
          const isFollowing = dbBrand ?
            await this.isUserFollowingBrand(userId, dbBrand._id.toString()) :
            false;

          // Process products to match the expected format
          const processedProducts = await Promise.all(
            products.map(async (product) => {
              // Find the main variant
              const mainVariant = product.variants?.find(v => v.isActive) || product.variants?.[0];

              // Get the main image
              const mainImage = mainVariant?.images?.find(img => img.isMain) || mainVariant?.images?.[0];

              // Check if product is in favorites
              const isFavorite = await this.favoriteModel.exists({ productId: product.ikasProductId, user: userId });

              return {
                _id: product.ikasProductId,
                name: product.name,
                brandName: brand.name,
                image: mainImage?.imageId,
                price: mainVariant?.price || 0,
                discount: mainVariant?.compareAtPrice ?
                  Math.round(((mainVariant.compareAtPrice - mainVariant.price) / mainVariant.compareAtPrice) * 100) : 0,
                isFavorite: !!isFavorite
              };
            })
          );

          return {
            _id: dbBrand?._id.toString() || brand.id,
            ikasId: brand.id,
            name: brand.name,
            logo: brand.imageId ? `https://cdn.myikas.com/images/f9291f47-d657-4569-9a4e-e2f64abed207/${brand.imageId}/image_720.webp` : null,
            description: brand.description || '',
            rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random rating between 4.0-5.0
            products: processedProducts,
            isFollowing: isFollowing
          };
        })
      );

      // Filter out brands with no products
      const brandsWithProducts = processedBrands.filter(brand => brand.products && brand.products.length > 0);

      return brandsWithProducts;
    } catch (error) {
      console.error('Error fetching brands with products:', error);
      throw error;
    }
  }

  // New method to get a single brand with isFollowing info
  async getBrandById(brandId: string, userId: string) {
    try {
      // Find the brand in our database
      const brand = await this.brandModel.findById(brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      // Check if user is following this brand
      const isFollowing = await this.isUserFollowingBrand(userId, brandId);

      // Get products for this brand
      const products = await this.productModel
        .find({ brandId: brand.ikasId })
        .lean();

      // Process products to match the expected format
      const processedProducts = await Promise.all(
        products.map(async (product) => {
          // Find the main variant
          const mainVariant = product.variants?.find(v => v.isActive) || product.variants?.[0];

          // Get the main image
          const mainImage = mainVariant?.images?.find(img => img.isMain) || mainVariant?.images?.[0];

          // Check if product is in favorites
          const isFavorite = await this.favoriteModel.exists({ productId: product.ikasProductId, user: userId });

          console.log('product ===> mainVariant', mainVariant);

          return {
            _id: product.ikasProductId,
            name: product.name,
            brandName: brand.name,
            image: mainImage?.imageId,
            price: mainVariant?.price || 0,
            discount: mainVariant?.compareAtPrice || 0,
            isFavorite: !!isFavorite
          };
        })
      );

      return {
        _id: brand._id.toString(),
        ikasId: brand.ikasId,
        name: brand.name,
        logo: brand.imageId ? `https://cdn.myikas.com/images/f9291f47-d657-4569-9a4e-e2f64abed207/${brand.imageId}/image_720.webp` : null,
        description: brand.description || '',
        rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random rating between 4.0-5.0
        products: processedProducts,
        isFollowing: isFollowing
      };
    } catch (error) {
      console.error('Error fetching brand:', error);
      throw error;
    }
  }
}
