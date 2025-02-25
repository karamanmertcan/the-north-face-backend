import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBrands() {
    return this.brandsService.getBrands();
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
