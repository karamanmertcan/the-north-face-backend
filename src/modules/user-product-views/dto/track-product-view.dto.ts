import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum InteractionType {
    VIEW = 'view',
    CART = 'cart',
    FAVORITE = 'favorite',
    PURCHASE = 'purchase',
}

export class TrackProductViewDto {
    @ApiProperty({
        description: 'Product ID',
        example: '60d21b4667d0d8992e610c85',
    })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Product name',
        example: 'Outdoor Jacket',
    })
    @IsString()
    @IsNotEmpty()
    productName: string;

    @ApiProperty({
        description: 'Brand name',
        example: 'The North Face',
    })
    @IsString()
    @IsNotEmpty()
    brandName: string;

    @ApiPropertyOptional({
        description: 'Product image URL',
        example: 'https://example.com/image.jpg',
    })
    @IsString()
    @IsOptional()
    image?: string;

    @ApiPropertyOptional({
        description: 'Product price',
        example: 199.99,
    })
    @IsNumber()
    @IsOptional()
    price?: number;

    @ApiPropertyOptional({
        description: 'Product discount percentage',
        example: 15,
    })
    @IsNumber()
    @IsOptional()
    discount?: number;

    @ApiProperty({
        description: 'Type of interaction with the product',
        enum: InteractionType,
        example: InteractionType.VIEW,
    })
    @IsEnum(InteractionType)
    @IsNotEmpty()
    interactionType: InteractionType;

    @ApiPropertyOptional({
        description: 'Duration of view in seconds',
        example: 45,
        minimum: 1,
    })
    @IsNumber()
    @Min(1)
    @IsOptional()
    viewDuration?: number;
} 