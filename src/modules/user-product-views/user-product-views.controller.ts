import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Query,
    Delete,
    HttpStatus,
} from '@nestjs/common';
import { UserProductViewsService } from './user-product-views.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiQuery,
} from '@nestjs/swagger';
import { TrackProductViewDto, InteractionType } from './dto/track-product-view.dto';
import { CurrentUser } from 'src/decorators/current-user';

@ApiTags('user-product-views')
@Controller('user-product-views')
export class UserProductViewsController {
    constructor(private readonly userProductViewsService: UserProductViewsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Track a product view or interaction' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Product view tracked successfully',
    })
    async trackProductView(
        @CurrentUser() user: any,
        @Body() trackProductViewDto: TrackProductViewDto,
    ) {
        return this.userProductViewsService.trackProductView(
            user._id,
            trackProductViewDto,
            trackProductViewDto.interactionType,
            trackProductViewDto.viewDuration,
        );
    }

    @Get('recently-viewed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get recently viewed products' })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of products to return (default: 10)',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Recently viewed products retrieved successfully',
    })
    async getRecentlyViewedProducts(
        @CurrentUser() user: any,
        @Query('limit') limit?: number,
    ) {
        return this.userProductViewsService.getRecentlyViewedProducts(
            user._id,
            limit ? parseInt(String(limit), 10) : 10,
        );
    }

    @Get('most-viewed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get most viewed products' })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of products to return (default: 10)',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Most viewed products retrieved successfully',
    })
    async getMostViewedProducts(
        @CurrentUser() user: any,
        @Query('limit') limit?: number,
    ) {
        return this.userProductViewsService.getMostViewedProducts(
            user._id,
            limit ? parseInt(String(limit), 10) : 10,
        );
    }

    @Get('by-interaction')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get products by interaction type' })
    @ApiQuery({
        name: 'type',
        required: true,
        enum: InteractionType,
        description: 'Type of interaction',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of products to return (default: 10)',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Products retrieved successfully',
    })
    async getProductsByInteractionType(
        @CurrentUser() user: any,
        @Query('type') type: InteractionType,
        @Query('limit') limit?: number,
    ) {
        return this.userProductViewsService.getProductsByInteractionType(
            user._id,
            type,
            limit ? parseInt(String(limit), 10) : 10,
        );
    }

    @Delete('clear-history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Clear view history' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'View history cleared successfully',
    })
    async clearViewHistory(@CurrentUser() user: any) {
        return this.userProductViewsService.clearViewHistory(user._id);
    }
} 