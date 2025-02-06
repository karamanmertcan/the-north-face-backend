import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Get()
  async getProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.productsService.getProducts(page, limit);
  }

  @Get('list/:id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Get('categories')
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get('categories/:orderType')
  async getCategoryByOrderType(@Param('orderType') orderType: string) {
    return this.productsService.getCategoryByOrderType(orderType);
  }
}
