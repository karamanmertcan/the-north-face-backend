import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IkasUser, IkasUserDocument } from './schemas/ikas-user.schema';

@Injectable()
export class IkasUsersService {
  constructor(
    @InjectModel(IkasUser.name) private ikasUserModel: Model<IkasUserDocument>,
  ) {}

  async findByEmail(email: string): Promise<IkasUserDocument> {
    return this.ikasUserModel.findOne({ email });
  }

  async findByIkasId(ikasId: string): Promise<IkasUserDocument> {
    return this.ikasUserModel.findOne({ ikasId });
  }

  async create(ikasUserData: any): Promise<IkasUserDocument> {
    const newIkasUser = new this.ikasUserModel({
      ikasId: ikasUserData.id,
      email: ikasUserData.email,
      firstName: ikasUserData.firstName,
      lastName: ikasUserData.lastName,
      fullName: ikasUserData.fullName,
      phone: ikasUserData.phone,
      gender: ikasUserData.gender,
      birthDate: ikasUserData.birthDate,
      isEmailVerified: ikasUserData.isEmailVerified,
      isPhoneVerified: ikasUserData.isPhoneVerified,
      accountStatus: ikasUserData.accountStatus,
      preferredLanguage: ikasUserData.preferredLanguage,
      addresses: ikasUserData.addresses,
      ikasToken: {
        token: ikasUserData.token,
        tokenExpiry: ikasUserData.tokenExpiry,
      },
    });

    return newIkasUser.save();
  }

  async update(ikasId: string, ikasUserData: any): Promise<IkasUserDocument> {
    return this.ikasUserModel.findOneAndUpdate(
      { ikasId },
      {
        $set: {
          email: ikasUserData.email,
          firstName: ikasUserData.firstName,
          lastName: ikasUserData.lastName,
          fullName: ikasUserData.fullName,
          phone: ikasUserData.phone,
          gender: ikasUserData.gender,
          birthDate: ikasUserData.birthDate,
          isEmailVerified: ikasUserData.isEmailVerified,
          isPhoneVerified: ikasUserData.isPhoneVerified,
          accountStatus: ikasUserData.accountStatus,
          preferredLanguage: ikasUserData.preferredLanguage,
          addresses: ikasUserData.addresses,
          ikasToken: {
            token: ikasUserData.token,
            tokenExpiry: ikasUserData.tokenExpiry,
          },
        },
      },
      { new: true },
    );
  }
}
