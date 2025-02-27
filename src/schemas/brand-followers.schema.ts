import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Brand } from './brand.schema';

@Schema({
    timestamps: true,
})
export class BrandFollowers {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand', required: true })
    brand: Brand;
}

export type BrandFollowersDocument = BrandFollowers & Document;

const BrandFollowersSchema = SchemaFactory.createForClass(BrandFollowers);

// Create a compound index to ensure a user can only follow a brand once
BrandFollowersSchema.index({ user: 1, brand: 1 }, { unique: true });

export { BrandFollowersSchema }; 