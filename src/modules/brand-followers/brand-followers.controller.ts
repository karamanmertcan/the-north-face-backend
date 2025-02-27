import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { BrandFollowersService } from './brand-followers.service';
import { FollowBrandDto } from '../../dtos/brand-followers/follow-brand.dto';
import { BrandsService } from '../brands/brands.service';
import { CurrentUser } from 'src/decorators/current-user';

@ApiTags('brand-followers')
@ApiBearerAuth()
@Controller('brand-followers')
export class BrandFollowersController {
    constructor(
        private readonly brandFollowersService: BrandFollowersService,
        private readonly brandsService: BrandsService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('follow')
    @ApiOperation({
        summary: 'Follow a brand',
        description: 'Creates a new follow relationship between user and brand',
    })
    @ApiResponse({ status: 201, description: 'Brand followed successfully' })
    @ApiResponse({ status: 400, description: 'User is already following this brand' })
    @ApiResponse({ status: 404, description: 'Brand not found' })
    async followBrand(@Body() followBrandDto: FollowBrandDto, @CurrentUser() userId: string) {
        return this.brandFollowersService.followBrand(followBrandDto, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('unfollow')
    @ApiOperation({
        summary: 'Unfollow a brand',
        description: 'Removes the follow relationship between user and brand',
    })
    @ApiResponse({ status: 200, description: 'Brand unfollowed successfully' })
    @ApiResponse({ status: 400, description: 'User is not following this brand' })
    @ApiResponse({ status: 404, description: 'Brand not found' })
    async unfollowBrand(@Body() followBrandDto: FollowBrandDto, @CurrentUser() userId: string) {
        return this.brandFollowersService.unfollowBrand(followBrandDto, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('is-following/:brandId')
    @ApiOperation({
        summary: 'Check if user is following a brand',
        description: 'Returns true if the user is following the brand, false otherwise',
    })
    @ApiResponse({ status: 200, description: 'Following status retrieved successfully' })
    async isFollowingBrand(@Param('brandId') brandId: string, @CurrentUser() userId: string) {
        const isFollowing = await this.brandFollowersService.isFollowingBrand(brandId, userId);
        return { isFollowing };
    }

    @UseGuards(JwtAuthGuard)
    @Get('with-products')
    @ApiOperation({
        summary: 'Get followed brands with products',
        description: 'Retrieves all brands followed by the user with their products',
    })
    @ApiResponse({ status: 200, description: 'Followed brands with products retrieved successfully' })
    async getFollowedBrandsWithProducts(@CurrentUser() currentUser) {
        const followedBrands = await this.brandFollowersService.getUserFollowedBrands(currentUser._id);
        const brandsWithProducts = await Promise.all(
            followedBrands.map(async (brand: any) => {
                return this.brandsService.getBrandById(brand._id.toString(), currentUser._id);
            })
        );
        return { data: brandsWithProducts };
    }

    @UseGuards(JwtAuthGuard)
    @Get('activities')
    @ApiOperation({
        summary: 'Get activities from followed brands',
        description: 'Retrieves a feed of recent product activities from brands the user follows'
    })
    @ApiResponse({ status: 200, description: 'Recent brand activities successfully retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getFollowedBrandsActivities(@CurrentUser() currentUser) {
        try {
            const activities = await this.brandFollowersService.getFollowedBrandsActivities(currentUser._id);
            return {
                success: true,
                data: activities
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
} 