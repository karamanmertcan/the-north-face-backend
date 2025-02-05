import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../../schemas/comment.schema';

@Injectable()
export class CommentsService {
    constructor(
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    ) { }

    async createComment(videoId: string, userId: string, content: string) {
        const comment = new this.commentModel({
            content,
            user: userId,
            video: videoId,
        });
        return (await comment.save()).populate('user');
    }

    async createReply(videoId: string, userId: string, content: string, parentCommentId: string) {
        const reply = new this.commentModel({
            content,
            user: userId,
            video: videoId,
            parentComment: parentCommentId,
        });

        const savedReply = await reply.save();

        // Parent comment'e reply'ı ekle
        await this.commentModel.findByIdAndUpdate(
            parentCommentId,
            { $push: { replies: savedReply._id } }
        );

        return savedReply.populate('user');
    }

    async getVideoComments(videoId: string) {
        return this.commentModel
            .find({ video: videoId, parentComment: null })
            .populate('user')
            .populate({
                path: 'replies',
                populate: {
                    path: 'user',
                },
            })
            .sort({ createdAt: -1 });
    }

    async likeComment(commentId: string, userId: string) {
        const comment = await this.commentModel.findById(commentId);

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (comment.likedBy.includes(userId)) {
            throw new Error('Comment already liked');
        }

        return this.commentModel.findByIdAndUpdate(
            commentId,
            {
                $addToSet: { likedBy: userId },
                $inc: { likes: 1 },
            },
            { new: true }
        ).populate('user');
    }


    async getCommentsCount(videoId: string) {
        const comments = await this.commentModel.countDocuments({ video: videoId });
        console.log('comments', comments)
        return comments;
    }
} 