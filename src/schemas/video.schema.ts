import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({
  timestamps: true,
})
export class Video {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop()
  thumbnailUrl: string;

  @Prop({ default: 0 })
  views: number;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ default: 0 })
  dislikes: number;

  @Prop({ type: [String], default: [] })
  dislikedBy: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creator: User;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: false })
  isReported: boolean;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({
    type: [{
      productId: String,
      variantId: String,
      name: String,
      price: Number,
      mainImageId: String,
      brand: {
        id: String,
        name: String,
      },
      selectedVariants: [{ valueId: String, valueName: String }],
    }],
    default: [],
  })
  taggedProducts: Array<{
    productId: string;
    variantId: string;
    name: string;
    price: number;
    mainImageId: string;
    brand: {
      id: string;
      name: string;
    };
    selectedVariants: Array<{
      valueId: string;
      valueName: string;
    }>;
  }>;
}
export type VideoDocument = Video & Document;

const VideoSchema = SchemaFactory.createForClass(Video);

export { VideoSchema };
