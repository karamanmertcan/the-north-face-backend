import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Video } from './video.schema';

@Schema({
    timestamps: true,
})
export class Comment {
    @Prop({ type: String, required: true })
    content: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Video', required: true })
    video: Video;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Comment' })
    parentComment?: Comment; // Reply için parent comment

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Comment' }] })
    replies: Comment[];

    @Prop({ type: [String], default: [] })
    likedBy: string[];

    @Prop({ default: 0 })
    likes: number;
}

export type CommentDocument = Comment & Document;
const CommentSchema = SchemaFactory.createForClass(Comment);

export { CommentSchema }

