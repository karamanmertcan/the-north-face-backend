import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PendingOrder {
    @Prop({ required: true })
    invoiceId: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    items: Array<{
        productId: Types.ObjectId;
        variantId: Types.ObjectId;
        quantity: number;
        price: number;
        name: string;
        image: string;
    }>;

    @Prop({ type: Object, required: true })
    shippingAddress: {
        addressId: Types.ObjectId;
        firstName: string;
        lastName: string;
        phone: string;
        addressLine1: string;
        apartment: string;
        postalCode: string;
        country: {
            id: string;
            name: string;
        };
        city: {
            id: string;
            name: string;
        };
        district: {
            id: string;
            name: string;
        };
    };

    @Prop({ default: 'pending' })
    status: string;

    @Prop({ type: Object, required: true })
    shippingMethod: {
        type: string;
        name: string;
        price: number;
    };
}

export type PendingOrderDocument = PendingOrder & Document;
export const PendingOrderSchema = SchemaFactory.createForClass(PendingOrder); 