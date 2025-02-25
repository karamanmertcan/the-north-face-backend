import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
    timestamps: true,
})
export class Favorite {
    @ApiProperty({
        description: 'User ID who added the favorite',
        type: String,
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @ApiProperty({
        description: 'Product ID that was added to favorites',
        example: '60d21b4667d0d8992e610c85',
        type: String,
    })
    @Prop({
        type: String,
        required: true,
    })
    productId: string;

    //product ı tutmak istiyorum direkt
    @ApiProperty({
        description: 'Complete product object with details',
        example: {
            _id: '60d21b4667d0d8992e610c85',
            name: 'Product Name',
            brandName: 'Brand Name',
            price: 100,
            discount: null,
            image: 'image-id',
            variants: [],
        },
    })
    @Prop({
        type: Object,
        required: true,
    })
    product: any;
}
export type FavoriteDocument = Favorite & Document;

const FavoriteSchema = SchemaFactory.createForClass(Favorite);

export { FavoriteSchema };
