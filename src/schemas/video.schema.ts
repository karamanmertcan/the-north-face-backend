import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type VideoDocument = Video & Document;

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

    @Prop({ required: true })
    thumbnailUrl: string;

    @Prop({ default: 0 })
    views: number;

    @Prop({ default: 0 })
    likes: number;

    @Prop({ default: 0 })
    dislikes: number;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
    likedBy: User[];

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
    dislikedBy: User[];

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
}

export const VideoSchema = SchemaFactory.createForClass(Video); 