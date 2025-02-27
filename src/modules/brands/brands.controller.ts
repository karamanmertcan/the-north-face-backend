import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({
    status: 200,
    description: 'The list of brands has been successfully returned',
  })
  async getBrands() {
    return this.brandsService.getBrands();
  }

  @Get('products/:brandId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products by brand' })
  @ApiResponse({
    status: 200,
    description: 'The list of products by brand has been successfully returned',
  })
  async getBrandProducts(@Param('brandId') brandId: string) {
    return this.brandsService.getProductsByBrand(brandId);
  }

  @Get('discover/with-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brands with products' })
  @ApiResponse({
    status: 200,
    description: 'The list of brands with products has been successfully returned',
  })
  async getBrandsWithProducts(
    @Query('limit') limit: number = 4,
    @CurrentUser() currentUser
  ) {
    const brandsWithProducts = await this.brandsService.getBrandsWithProducts(limit, currentUser._id);
    return {
      success: true,
      data: brandsWithProducts,
    };
  }

  @Get('by-id/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single brand by ID with following information' })
  @ApiResponse({
    status: 200,
    description: 'The brand has been successfully returned',
  })
  @ApiResponse({
    status: 404,
    description: 'Brand not found',
  })
  getBrandById(
    @Param('id') id: string,
    @CurrentUser() currentUser
  ) {
    return this.brandsService.getBrandById(id, currentUser._id);
  }
}
