import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBrands() {
    return this.brandsService.getBrands();
  }

  @UseGuards(JwtAuthGuard)
  @Get('discover/with-products')
  async getBrandsWithProducts(@Query('limit') limit: number = 4, @CurrentUser() currentUser) {
    const brandsWithProducts = await this.brandsService.getBrandsWithProducts(limit, currentUser._id);
    return {
      success: true,
      data: {
        brands: brandsWithProducts
      }
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':brandId/products')
  async getBrandProducts(@Param('brandId') brandId: string) {
    return this.brandsService.getBrandProducts(brandId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':brandId')
  async getBrand(@Param('brandId') brandId: string) {
    return this.brandsService.getProductsByBrand(brandId);
  }
}
