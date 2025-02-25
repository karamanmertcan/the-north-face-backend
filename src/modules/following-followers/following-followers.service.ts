import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FollowersFollowings,
  FollowersFollowingsDocument,
} from 'src/schemas/followers-followings.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FollowingFollowersDto } from 'src/dtos/following-followers/following-followers.dto';
@Injectable()
export class FollowingFollowersService {
  constructor(
    @InjectModel(FollowersFollowings.name)
    private followersFollowingsModel: Model<FollowersFollowingsDocument>,
  ) {}

  async follow(followingFollowersDto: FollowingFollowersDto, userId: string) {
    const { following } = followingFollowersDto;

    console.log('following', following);
    console.log('userId', userId);

    const existingFollowersFollowings =
      await this.followersFollowingsModel.findOne({
        following,
        follower: userId,
      });
    if (existingFollowersFollowings) {
      throw new BadRequestException('You are already following this user');
    }

    // //kişi kendini takip edemez
    // if (existingFollowersFollowings.following.toString() === existingFollowersFollowings.follower.toString()) {
    //     throw new BadRequestException('You cannot follow yourself');
    // }

    const newFollowersFollowings = new this.followersFollowingsModel({
      following,
      follower: userId,
    });
    return newFollowersFollowings.save();
  }

  async unfollow(followingFollowersDto: FollowingFollowersDto, userId: string) {
    const { following } = followingFollowersDto;

    const existingFollowersFollowings =
      await this.followersFollowingsModel.findOne({
        following,
        follower: userId,
      });
    if (!existingFollowersFollowings) {
      throw new BadRequestException('You are not following this user');
    }

    return existingFollowersFollowings.deleteOne();
  }

  async getFollowing(userId: string) {
    try {
      const followings = await this.followersFollowingsModel
        .find({ follower: userId })
        .populate('following', '-password')
        .lean();

      // Her bir following için isFollowing field'ı ekleyelim
      const followingsWithIsFollowing = await Promise.all(
        followings.map(async (follow) => {
          // Karşılıklı takipleşme durumunu kontrol et
          const isFollowingBack = await this.followersFollowingsModel
            .findOne({
              follower: (follow.following as any)._id,
              following: userId,
            })
            .lean();

          return {
            ...follow,
            following: {
              ...follow.following,
              isFollowing: !!isFollowingBack,
            },
          };
        }),
      );

      console.log('followingsWithIsFollowing', followingsWithIsFollowing);

      return followingsWithIsFollowing;
    } catch (error) {
      console.error('Get following error:', error);
      throw new Error('Following listesi alınamadı');
    }
  }

  async getFollowers(userId: string) {
    try {
      const followers = await this.followersFollowingsModel
        .find({ following: userId })
        .populate('follower', '-password')
        .lean();

      // Her bir follower için isFollowing field'ı ekleyelim
      const followersWithIsFollowing = await Promise.all(
        followers.map(async (follow) => {
          // Karşılıklı takipleşme durumunu kontrol et
          const isFollowingBack = await this.followersFollowingsModel
            .findOne({
              follower: userId,
              following: (follow.follower as any)._id,
            })
            .lean();

          return {
            ...follow,
            follower: {
              ...follow.follower,
              isFollowing: !!isFollowingBack,
            },
          };
        }),
      );

      return followersWithIsFollowing;
    } catch (error) {
      console.error('Get followers error:', error);
      throw new Error('Followers listesi alınamadı');
    }
  }
}
