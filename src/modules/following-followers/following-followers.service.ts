import { BadRequestException, Injectable } from '@nestjs/common';
import { FollowersFollowings, FollowersFollowingsDocument } from 'src/schemas/followers-followings.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FollowingFollowersDto } from 'src/dtos/following-followers/following-followers.dto';
@Injectable()
export class FollowingFollowersService {
    constructor(
        @InjectModel(FollowersFollowings.name) private followersFollowingsModel: Model<FollowersFollowingsDocument>,
    ) { }

    async follow(followingFollowersDto: FollowingFollowersDto, userId: string) {
        const { following } = followingFollowersDto;

        console.log('following', following)
        console.log('userId', userId)

        const existingFollowersFollowings = await this.followersFollowingsModel.findOne({ following, follower: userId });
        if (existingFollowersFollowings) {
            throw new BadRequestException('You are already following this user');
        }

        // //kişi kendini takip edemez
        // if (existingFollowersFollowings.following.toString() === existingFollowersFollowings.follower.toString()) {
        //     throw new BadRequestException('You cannot follow yourself');
        // }

        const newFollowersFollowings = new this.followersFollowingsModel({ following, follower: userId });
        return newFollowersFollowings.save();
    }

    async unfollow(followingFollowersDto: FollowingFollowersDto, userId: string) {
        const { following } = followingFollowersDto;

        const existingFollowersFollowings = await this.followersFollowingsModel.findOne({ following, follower: userId });
        if (!existingFollowersFollowings) {
            throw new BadRequestException('You are not following this user');
        }



        return existingFollowersFollowings.deleteOne();
    }


    async getFollowing(userId: string) {
        const following = await this.followersFollowingsModel.find({ follower: userId });
        return following;
    }

    async getFollowers(userId: string) {
        const followers = await this.followersFollowingsModel.find({ following: userId });
        return followers;
    }

}
