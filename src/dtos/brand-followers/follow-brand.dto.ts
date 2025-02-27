import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FollowBrandDto {
    @ApiProperty({
        description: 'The ID of the brand to follow',
        example: '60d21b4667d0d8992e610c85',
    })
    @IsNotEmpty()
    @IsMongoId()
    brandId: string;
} 