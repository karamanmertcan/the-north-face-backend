import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';


@Schema({
    timestamps: true,
})
export class Brand {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    imageId: string;

    @Prop({ type: String, required: true, unique: true })
    ikasId: string;
    @Prop({ type: String, required: true })
    description: string;

    @Prop({ type: [String], required: true })
    salesChannelIds: string[];
}

export type BrandDocument = Brand & Document;

const BrandSchema =
    SchemaFactory.createForClass(Brand);

export { BrandSchema };
