import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CurrentUser } from 'src/decorators/current-user';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @ApiOperation({
    summary: 'Get all products',
    description: 'Retrieve a list of all products',
  })
  @ApiResponse({ status: 200, description: 'Returns list of products' })
  @Get()
  async getProducts() {
    return this.productsService.getProducts();
  }

  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product by its ID',
  })
  @ApiResponse({ status: 200, description: 'Returns the product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @Get('list/:id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @ApiOperation({
    summary: 'Search products',
    description: 'Search products by query string',
  })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Results per page',
    required: false,
    type: Number,
  })
  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productsService.searchProducts(query, page, limit);
  }

  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve a list of all product categories',
  })
  @ApiResponse({ status: 200, description: 'Returns list of categories' })
  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  @ApiOperation({
    summary: 'Get category by order type',
    description: 'Retrieve a specific category by its order type',
  })
  @ApiResponse({ status: 200, description: 'Returns the category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({
    name: 'orderType',
    description: 'Category order type',
    example: 'featured',
  })
  @Get('categories/:orderType')
  async getCategoryByOrderType(@Param('orderType') orderType: string) {
    return this.productsService.getCategoryByOrderType(orderType);
  }

  @ApiOperation({
    summary: 'Sync products',
    description: 'Synchronize products with external system',
  })
  @ApiResponse({
    status: 200,
    description: 'Products synchronized successfully',
  })
  @Get('sync')
  async syncProducts() {
    return this.productsService.syncProducts();
  }

  @ApiOperation({
    summary: 'Get best sellers',
    description: 'Retrieve a list of best-selling products',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of best-selling products',
  })
  @Get('best-sellers')
  async getBestSellers() {
    return this.productsService.getBestSellers();
  }

  @ApiOperation({
    summary: 'Get community products',
    description: 'Retrieve a list of community products',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of community products',
  })
  @Get('community')
  async getCommunityProducts() {
    return this.productsService.getCommunityProducts();
  }

  @ApiOperation({
    summary: 'Get products by category ID',
    description: 'Retrieve products belonging to a specific category',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of products in the category',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiBearerAuth('JWT-auth')
  @Get('category/:id')
  @UseGuards(JwtAuthGuard)
  async getProductByCategorieId(
    @Param('id') id: string,
    @CurrentUser() currentUser,
  ) {
    return this.productsService.getProductByCategorieId(id, currentUser._id);
  }
}
