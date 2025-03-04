import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InteractionType } from '../dto/track-product-view.dto';

export type UserProductViewDocument = UserProductView & Document;

/**
 * Kullanıcıların görüntülediği ürünleri takip eden şema
 */
@Schema({ timestamps: true })
export class UserProductView extends Document {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true, index: true, type: String })
    productId: string;

    @Prop({ required: true })
    productName: string;

    @Prop()
    brandName: string;

    @Prop()
    image: string;

    @Prop({ type: Number })
    price: number;

    @Prop({ type: Number })
    discount: number;

    @Prop({
        type: String,
        enum: Object.values(InteractionType),
        default: InteractionType.VIEW
    })
    interactionType: InteractionType;

    @Prop({ default: 1 })
    viewCount: number;

    @Prop({ default: 0 })
    totalViewDuration: number; // Saniye cinsinden toplam görüntüleme süresi

    @Prop({ type: Date, default: Date.now })
    lastViewedAt: Date;
}

export const UserProductViewSchema = SchemaFactory.createForClass(UserProductView);

// Aynı kullanıcı ve ürün için benzersiz indeks oluştur
UserProductViewSchema.index({ userId: 1, productId: 1 }, { unique: true }); 