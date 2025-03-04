import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { isValidObjectId, Model } from 'mongoose';
import { Product, ProductDocument } from 'src/schemas/product.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Video, VideoDocument } from 'src/schemas/video.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Brand, BrandDocument } from 'src/schemas/brand.schema';

@Injectable()
export class ProductsService {
  constructor(
    private ikasService: IkasService,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
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
                                description
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
                    }`,
        );

        const products = response.data.data.listProduct.data.map(
          (product: any) => ({
            ikasProductId: product.id,
            name: product.name,
            vendorId: product.vendorId,
            categories: product.categories,
            productVariantTypes: product.productVariantTypes,
            brand: product.brand,
            brandId: product.brandId,
            tags: product.tags,
            description: product.description,
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
                isMain: img.isMain,
              })),
              values: variant.values || [],
            })),
          }),
        );

        hasNext = response.data.data.listProduct.hasNext;

        for (const product of products) {
          await this.productModel.findOneAndUpdate(
            { ikasProductId: product.ikasProductId },
            product,
            { upsert: true, new: true },
          );
        }

        console.log(`Synced page ${page}`);
        page++;

        // Rate limiting - her sayfa arasında 1 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('Product sync completed successfully');
    } catch (error) {
      console.error('Error syncing products:', error);
    }
  }

  async getProducts() {
    try {
      const accessToken = await this.ikasService.getAccessToken();
      const products = await this.productModel.find().limit(20);

      const productsWithFavorites = await Promise.all(
        products.map(async (product: any) => {
          const findProductIsFavorite = await this.favoriteModel.findOne({
            productId: product.ikasProductId,
          });
          const mainVariant =
            product.variants?.find((v: any) => v.isActive) ||
            product.variants?.[0];
          const price = mainVariant?.price;
          const discountPrice = mainVariant?.compareAtPrice;

          // Use the helper method to normalize variants
          const normalizedVariants = await this.normalizeProductVariants(
            product,
            accessToken,
          );

          return {
            _id: product._id,
            productId: product.ikasProductId,
            name: product.name,
            brandName: product.brand?.name || '',
            image: mainVariant?.images?.[0]?.imageId,
            price: price,
            discount: discountPrice,
            variants: product.variants || [],
            normalizedVariants,
            isFavorite: findProductIsFavorite ? true : false,
          };
        }),
      );

      return {
        data: productsWithFavorites,
      };
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  async getProductById(id: string, userId: string) {
    console.log('inner id', id)
    console.log('inner userId', userId)
    try {
      const accessToken = await this.ikasService.getAccessToken();
      // Önce MongoDB'de ara
      let dbProduct: any;

      if (isValidObjectId(id)) {
        // Eğer ObjectId ise direkt _id ile ara
        console.log('ObjectId');
        dbProduct = await this.productModel.findOne({ _id: id });
      } else {
        // ObjectId değilse ikasProductId ile ara
        console.log('ikasProductId');
        dbProduct = await this.productModel.findOne({ ikasProductId: id });
      }

      if (!dbProduct) {
        throw new Error('Product not found');
      }

      // Use the helper method to normalize variants
      const normalizedVariants = await this.normalizeProductVariants(
        dbProduct,
        accessToken,
      );

      const findProductIsFavorite = await this.favoriteModel.findOne({
        productId: dbProduct.ikasProductId,
        user: userId,
      });

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
          prices: [
            {
              sellPrice: variant.price,
              discountPrice: variant.compareAtPrice,
              currency: 'TRY',
            },
          ],
        })),
      };

      return {
        ...formattedProduct,
        normalizedVariants,
        isFavorite: findProductIsFavorite ? true : false,
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
                    `,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Kategori listesi alma hatası:', error);
      throw error;
    }
  }

  async searchProducts(query: string, category?: string): Promise<any> {
    try {
      console.log('query', query);
      console.log('category', category);

      // Arama sorgusu için regex oluştur
      const searchRegex = new RegExp(query, 'i');

      // Eğer kategori belirtilmişse sadece o kategoride ara
      if (category && ['products', 'videos', 'users', 'brands'].includes(category.toLowerCase())) {
        return await this.searchByCategory(query, category.toLowerCase());
      }

      // Kategori belirtilmemişse veya "top" ise tüm kategorilerde ara ve birleştir
      const [products, videos, users, brands] = await Promise.all([
        this.searchByCategory(query, 'products'),
        this.searchByCategory(query, 'videos'),
        this.searchByCategory(query, 'users'),
        this.searchByCategory(query, 'brands')
      ]);

      return {
        success: true,
        data: {
          products: products.data,
          videos: videos.data,
          users: users.data,
          brands: brands.data
        },
        message: 'Arama sonuçları başarıyla getirildi'
      };
    } catch (error) {
      console.error('Arama hatası:', error);
      return {
        success: false,
        data: {},
        message: 'Arama sırasında bir hata oluştu'
      };
    }
  }

  // Kategoriye göre arama yapan yardımcı fonksiyon
  private async searchByCategory(query: string, category: string): Promise<any> {
    const searchRegex = new RegExp(query, 'i');

    try {
      switch (category) {
        case 'products':
          // Ürünleri ara
          const products = await this.productModel.find({
            $or: [
              { name: { $regex: searchRegex } },
              { "brand.name": { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
            ],
          }).limit(20);

          // Ürünleri formatla
          const formattedProducts = products.map(product => {
            const mainVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
            const mainImage = mainVariant && mainVariant.images && mainVariant.images.length > 0
              ? mainVariant.images.find(img => img.isMain) || mainVariant.images[0]
              : null;

            // Variant yapısında price ve compareAtPrice alanlarını kullan
            const price = mainVariant ? mainVariant.price || 0 : 0;
            const compareAtPrice = mainVariant ? mainVariant.compareAtPrice || null : null;

            // İndirim oranını hesapla - compareAtPrice > price olduğunda indirim var demektir
            const discount = compareAtPrice && compareAtPrice > price
              ? Math.round((1 - price / compareAtPrice) * 100)
              : 0;

            return {
              _id: product._id,
              id: product.ikasProductId || product._id,
              name: product.name,
              brandName: product.brand ? product.brand.name : '',
              price: price,
              discount: discount,
              image: mainImage ? mainImage.imageId : null,
              description: product.description || '',
            };
          });

          return {
            success: true,
            data: formattedProducts,
            message: 'Ürünler başarıyla getirildi'
          };

        case 'videos':

          const videos = await this.videoModel.find({
            $or: [
              { title: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
            ],
          }).limit(20);

          console.log('videos', videos);

          return {
            success: true,
            data: videos,
            message: 'Videolar başarıyla getirildi'
          };

        case 'users':

          const users = await this.userModel.find({
            $or: [
              { username: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
            ],
          }).limit(20);

          return {
            success: true,
            data: users,
            message: 'Kullanıcılar başarıyla getirildi'
          };

        case 'brands':

          const brands = await this.brandModel.find({
            $or: [
              { name: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
            ],
          }).limit(20);

          return {
            success: true,
            data: brands,
            message: 'Markalar başarıyla getirildi'
          };

        default:
          return {
            success: false,
            data: [],
            message: 'Geçersiz kategori'
          };
      }
    } catch (error) {
      console.error(`${category} araması hatası:`, error);
      return {
        success: false,
        data: [],
        message: `${category} araması sırasında bir hata oluştu`
      };
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
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Kategori listesi alma hatası:', error);
      throw error;
    }
  }

  // Private helper method to normalize product variants
  public async normalizeProductVariants(product: any, accessToken: string) {
    try {
      // Fetch variant types for this product
      const variantTypes = await Promise.all(
        product.productVariantTypes.map(async (variantType: any) => {
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
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          const variantTypeData =
            variantTypeResponse.data.data.listVariantType[0];

          // Filter variant values and add parentId
          const filteredValues = variantTypeData.values
            .filter((value: any) =>
              variantType.variantValueIds.includes(value.id),
            )
            .map((value: any, index: number) => {
              const relatedVariant = product.variants[index];
              return {
                id: value.id,
                name: value.name,
                colorCode: value.colorCode,
                thumbnailImageId: value.thumbnailImageId,
                parentId: relatedVariant?.id || null,
              };
            });

          return {
            id: variantTypeData.id,
            name: variantTypeData.name,
            values: filteredValues,
          };
        }),
      );

      return variantTypes;
    } catch (error) {
      console.error('Error normalizing product variants:', error);
      return [];
    }
  }

  async getBestSellers() {
    try {
      const accessToken = await this.ikasService.getAccessToken();
      const products = await this.productModel
        .find()
        .sort({ soldCount: -1 })
        .limit(10)
        .populate('brand');

      // Process each product to include normalized variants
      const formattedProducts = await Promise.all(
        products.map(async (product) => {
          const mainVariant: any =
            product.variants?.find((v) => v.isActive) || product.variants?.[0];
          const price = mainVariant?.price;
          const discountPrice = mainVariant?.compareAtPrice;
          const mainImage = mainVariant?.images?.[0];

          // Use the helper method to normalize variants
          const normalizedVariants = await this.normalizeProductVariants(
            product,
            accessToken,
          );

          // Check if product is in favorites
          const findProductIsFavorite = await this.favoriteModel.findOne({
            productId: product.ikasProductId,
          });

          return {
            _id: product._id,
            name: product.name,
            brandName: product.brand?.name || '',
            image: mainImage?.imageId,
            price: price || 0,
            productId: product.ikasProductId,
            discount: discountPrice || null,
            variants: product.variants || [],
            normalizedVariants,
            isFavorite: findProductIsFavorite ? true : false,
          };
        }),
      );

      return {
        success: true,
        data: formattedProducts,
      };
    } catch (error) {
      console.error('Error getting best sellers:', error);
      throw new Error('Failed to get best sellers');
    }
  }

  async getCommunityProducts() {
    try {
      const accessToken = await this.ikasService.getAccessToken();
      const products = await this.productModel
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('brand');

      // Process each product to include normalized variants
      const formattedProducts = await Promise.all(
        products.map(async (product) => {
          const mainVariant: any =
            product.variants?.find((v) => v.isActive) || product.variants?.[0];
          const price = mainVariant?.price;
          const discountPrice = mainVariant?.compareAtPrice;
          const mainImage = mainVariant?.images?.[0];

          // Use the helper method to normalize variants
          const normalizedVariants = await this.normalizeProductVariants(
            product,
            accessToken,
          );

          // Check if product is in favorites
          const findProductIsFavorite = await this.favoriteModel.findOne({
            productId: product.ikasProductId,
          });

          return {
            _id: product._id,
            name: product.name,
            brandName: product.brand?.name || '',
            image: mainImage?.imageId,
            price: price || 0,
            productId: product.ikasProductId,
            discount: discountPrice || null,
            variants: product.variants || [],
            normalizedVariants,
            isFavorite: findProductIsFavorite ? true : false,
          };
        }),
      );

      return {
        success: true,
        data: formattedProducts,
      };
    } catch (error) {
      console.error('Error getting community products:', error);
      throw new Error('Failed to get community products');
    }
  }

  async getProductByCategorieId(categoryId: string, userId?: string) {
    try {
      const accessToken = await this.ikasService.getAccessToken();
      const query = `
                query ListProduct($categoryIds: CategoryFilterInput) {
                    listProduct(categoryIds: $categoryIds) {
                        data {
                            id
                            name
                            vendorId
                            description
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
                            tags {
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

      const variables = {
        categoryIds: {
          eq: categoryId,
        },
      };

      const response = await this.ikasService.makeRequest(query, variables);

      if (!response?.data?.data?.listProduct?.data) {
        return [];
      }

      // Process each product to include normalized variants
      const productsData = response?.data?.data?.listProduct?.data;

      // Save products to MongoDB temporarily for variant normalization
      const processedProducts = await Promise.all(
        productsData.map(async (productData: any) => {
          // Convert IKAS product to our MongoDB schema format
          const productToSave = {
            ikasProductId: productData.id,
            name: productData.name,
            vendorId: productData.vendorId,
            categories: productData.categories,
            productVariantTypes: productData.productVariantTypes,
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

          // Get normalized variants
          const normalizedVariants = await this.normalizeProductVariants(
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
          let isFavorite = false;
          if (userId) {
            const favorite = await this.favoriteModel.findOne({
              userId,
              productId: productData.id,
            });
            isFavorite = !!favorite;
          }

          return {
            _id: productData.id,
            name: productData.name,
            brandName: productData.brand?.name || '',
            image: mainImage?.imageId,
            price: price || 0,
            discount: discountPrice || null,
            variants: productData.variants || [],
            normalizedVariants,
            type: 'ikas_product',
            isFavorite,
          };
        }),
      );

      return processedProducts;
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw new Error('Failed to get products by category');
    }
  }

  async getTrendingProducts(limit: number = 10): Promise<any> {
    // Burada gerçek bir algoritma kullanılabilir, şimdilik rastgele ürünler döndürelim
    console.log('sample limit', limit)
    // Limit parametresini sayıya dönüştür
    const sampleSize = parseInt(String(limit), 10) || 10;

    const products = await this.productModel.aggregate([
      { $sample: { size: sampleSize } },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          brandName: 1,
          brandId: 1,
          variants: 1,
          ikasProductId: 1,
          rating: { $round: [{ $multiply: [{ $rand: {} }, 5] }, 1] }, // Rastgele rating
          reviewCount: { $floor: { $multiply: [{ $rand: {} }, 1000] } }, // Rastgele yorum sayısı
        },
      },
    ]);

    const productsWithPrice = await Promise.all(products.map(async (product) => {
      const mainVariant = product.variants.find((v: any) => v.isActive);
      return {
        ...product,
        price: mainVariant.price,
        discount: mainVariant.compareAtPrice,
        imageId: mainVariant.images[0].imageId,
        productId: product.ikasProductId,
      };
    }));

    console.log('products', productsWithPrice)
    return {
      success: true,
      data: productsWithPrice,
    };
  }

  async getSearchSuggestions(): Promise<any> {
    // Popüler arama önerileri
    const suggestions = [
      'Villain Bear',
      'Sema Art Atelier',
      'Bere',
      'Baha Img',
      'Portre',
      'Alerma',
      'Mxthersocker',
      'Bomo',
    ];

    // Rastgele karıştır ve 5 tanesini döndür
    const randomSuggestions = suggestions
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    return {
      success: true,
      data: randomSuggestions,
    };
  }

  async getProductCategories(): Promise<any> {
    // Örnek kategoriler
    const categories = [
      { id: 1, name: 'Ayakkabı', icon: '👟' },
      { id: 2, name: 'Mont', icon: '🧥' },
      { id: 3, name: 'Pantolon', icon: '👖' },
      { id: 4, name: 'Tişört', icon: '👕' },
      { id: 5, name: 'Aksesuar', icon: '🧢' },
      { id: 6, name: 'Çanta', icon: '🎒' },
    ];

    return {
      success: true,
      data: categories,
    };
  }
}
