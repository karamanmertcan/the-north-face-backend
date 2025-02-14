import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    ikasOrderId: string;

    @Prop({ required: true })
    orderNumber: string;

    @Prop({ required: true })
    totalAmount: number;

    @Prop({
        type: [{
            productId: { type: Types.ObjectId, ref: 'Product' },
            variantId: { type: Types.ObjectId },
            quantity: Number,
            price: Number,
            name: String,
            image: String
        }],
        required: true
    })
    items: Array<{
        productId: Types.ObjectId;
        variantId: Types.ObjectId;
        quantity: number;
        price: number;
        name: string;
        image: string;
    }>;

    @Prop({
        type: {
            addressId: Types.ObjectId,
            firstName: String,
            lastName: String,
            phone: String,
            addressLine1: String,
            apartment: String,
            postalCode: String,
            country: {
                id: String,
                name: String
            },
            city: {
                id: String,
                name: String
            },
            district: {
                id: String,
                name: String
            }
        },
        required: true
    })
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

    @Prop()
    paymentId: string;

    @Prop({ default: false })
    isPaid: boolean;

    @Prop()
    paidAt: Date;
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order); 