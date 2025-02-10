import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Video } from './video.schema';


@Schema({
    timestamps: true,
})
export class Favorite {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({
        type: String,
        required: true
    })
    productId: string


    //product ı tutmak istiyorum direkt
    @Prop({
        type: Object,
        required: true
    })
    product: any
}
export type FavoriteDocument = Favorite & Document;

const FavoriteSchema = SchemaFactory.createForClass(Favorite);

export { FavoriteSchema };