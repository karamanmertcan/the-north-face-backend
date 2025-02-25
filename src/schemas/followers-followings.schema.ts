import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

import { User } from './user.schema';

@Schema({
  timestamps: true,
})
export class FollowersFollowings {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  follower: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  following: User;
}

export type FollowersFollowingsDocument = FollowersFollowings & Document;

const FollowersFollowingsSchema =
  SchemaFactory.createForClass(FollowersFollowings);

export { FollowersFollowingsSchema };
