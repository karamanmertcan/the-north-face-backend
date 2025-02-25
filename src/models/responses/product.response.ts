import { ApiProperty } from '@nestjs/swagger';

export class VariantImage {
  @ApiProperty({
    description: 'Image ID',
    example: 'image-123',
  })
  imageId: string;

  @ApiProperty({
    description: 'Whether this is the main image',
    example: true,
  })
  isMain: boolean;
}

export class VariantPrice {
  @ApiProperty({
    description: 'Sell price',
    example: 100,
  })
  sellPrice: number;

  @ApiProperty({
    description: 'Discount price',
    example: 80,
    required: false,
  })
  discountPrice?: number;

  @ApiProperty({
    description: 'Currency',
    example: 'TRY',
  })
  currency: string;
}

export class ProductVariant {
  @ApiProperty({
    description: 'Variant ID',
    example: 'variant-123',
  })
  id: string;

  @ApiProperty({
    description: 'Whether this variant is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'SKU',
    example: 'SKU123',
  })
  sku: string;

  @ApiProperty({
    description: 'Price',
    example: 100,
  })
  price: number;

  @ApiProperty({
    description: 'Compare at price',
    example: 120,
    required: false,
  })
  compareAtPrice?: number;

  @ApiProperty({
    description: 'Variant images',
    type: [VariantImage],
  })
  images: VariantImage[];

  @ApiProperty({
    description: 'Variant prices',
    type: [VariantPrice],
    required: false,
  })
  prices?: VariantPrice[];
}

export class VariantTypeValue {
  @ApiProperty({
    description: 'Value ID',
    example: 'value-123',
  })
  id: string;

  @ApiProperty({
    description: 'Value name',
    example: 'Red',
  })
  name: string;

  @ApiProperty({
    description: 'Color code',
    example: '#FF0000',
    required: false,
  })
  colorCode?: string;

  @ApiProperty({
    description: 'Thumbnail image ID',
    example: 'thumb-123',
    required: false,
  })
  thumbnailImageId?: string;

  @ApiProperty({
    description: 'Parent ID',
    example: 'parent-123',
  })
  parentId: string;
}

export class VariantType {
  @ApiProperty({
    description: 'Type ID',
    example: 'type-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type name',
    example: 'Color',
  })
  name: string;

  @ApiProperty({
    description: 'Type values',
    type: [VariantTypeValue],
  })
  values: VariantTypeValue[];
}

export class ProductResponse {
  @ApiProperty({
    description: 'Product ID',
    example: '60d21b4667d0d8992e610c85',
  })
  _id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'The North Face Jacket',
  })
  name: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'The North Face',
  })
  brandName: string;

  @ApiProperty({
    description: 'Main image ID',
    example: 'image-123',
  })
  image: string;

  @ApiProperty({
    description: 'Product price',
    example: 100,
  })
  price: number;

  @ApiProperty({
    description: 'Discount price',
    example: 80,
    required: false,
  })
  discount?: number;

  @ApiProperty({
    description: 'Product variants',
    type: [ProductVariant],
  })
  variants: ProductVariant[];

  @ApiProperty({
    description: 'Normalized variants',
    type: [VariantType],
  })
  normalizedVariants: VariantType[];

  @ApiProperty({
    description: 'Whether this product is in user favorites',
    example: false,
  })
  isFavorite: boolean;
}

export class ProductListResponse {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Products list',
    type: [ProductResponse],
  })
  data: ProductResponse[];
}
