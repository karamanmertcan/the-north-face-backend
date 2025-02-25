import { IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({
    description: 'Product ID to add to favorites',
    example: '60d21b4667d0d8992e610c85',
    required: true,
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Product object with details',
    example: {
      _id: '60d21b4667d0d8992e610c85',
      name: 'Product Name',
      brandName: 'Brand Name',
      price: 100,
      discount: null,
      image: 'image-id',
      variants: [],
    },
    required: true,
  })
  @IsObject()
  product: any;
}
