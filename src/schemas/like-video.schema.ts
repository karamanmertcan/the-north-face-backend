import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Video } from './video.schema';

@Schema({
  timestamps: true,
})
export class LikeVideo {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Video', required: true })
  video: Video;
}
export type LikeVideoDocument = LikeVideo & Document;

const LikeVideoSchema = SchemaFactory.createForClass(LikeVideo);

export { LikeVideoSchema };
