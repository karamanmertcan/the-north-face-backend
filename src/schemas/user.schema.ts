import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema({
    timestamps: true, // createdAt ve updatedAt alanlarını otomatik ekler
})
export class User {
    @Prop({ required: true, unique: true })
    username: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ default: 0 })
    points: number;

    @Prop({ default: [] })
    watchedVideos: string[];

    @Prop({ default: false })
    isVerified: boolean;

    @Prop({ default: 'user' })
    role: string;

    @Prop({ type: String, default: '' })
    firstName: string;

    @Prop({ type: String, default: '' })
    lastName: string;

    @Prop({ type: String, default: '' })
    avatar: string;
}

export type UserDocument = User & Document;

const UserSchema = SchemaFactory.createForClass(User);


export { UserSchema };