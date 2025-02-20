import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { CurrentUser } from 'src/decorators/current-user';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Get()
  async getProducts() {
    return this.productsService.getProducts();
  }

  @Get('list/:id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.productsService.searchProducts(query, page, limit);
  }

  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get('categories/:orderType')
  async getCategoryByOrderType(@Param('orderType') orderType: string) {
    return this.productsService.getCategoryByOrderType(orderType);
  }

  @Get('sync')
  async syncProducts() {
    return this.productsService.syncProducts();
  }

  @Get('best-sellers')
  async getBestSellers() {
    return this.productsService.getBestSellers();
  }

  @Get('community')
  async getCommunityProducts() {
    return this.productsService.getCommunityProducts();
  }

  @Get('category/:id')
  @UseGuards(JwtAuthGuard)
  async getProductByCategorieId(
    @Param('id') id: string,
    @CurrentUser() currentUser
  ) {
    return this.productsService.getProductByCategorieId(id, currentUser._id);
  }
}
