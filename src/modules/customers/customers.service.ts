import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IkasService } from 'src/services/ikas.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  IkasUser,
  IkasUserDocument,
} from '../ikas-users/schemas/ikas-user.schema';
import { UuidService } from 'nestjs-uuid';

@Injectable()
export class CustomersService {
  private readonly ikasApiUrl: string;

  constructor(
    private configService: ConfigService,
    private ikasService: IkasService,
    private readonly uuidService: UuidService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(IkasUser.name) private ikasUserModel: Model<IkasUserDocument>,
  ) {
    this.ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
  }

  async saveCustomer(userId: string, customerData: any) {
    console.log('saveCustomer', customerData);
    try {
      const user = await this.userModel.findById(userId);
      const ikasUser = await this.ikasUserModel.findOne({ email: user.email });
      console.log('ikasUser', ikasUser);
      console.log('user', user);
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const accessToken = await this.ikasService.getAccessToken();

      const mutation = `
            mutation SaveCustomer($input: CustomerInput!) {
                saveCustomer(input: $input) {
                    id
                    fullName
                    firstName
                    email
                    birthDate
                    gender
                    lastName
                    phone
                    addresses {
                        id
                        title
                        firstName
                        lastName
                        phone
                        postalCode
                        addressLine1
                        addressLine2
                        city {
                            id
                            name
                        }
                        district {
                            id
                            name
                        }
                        country {
                            id
                            name
                        }
                    }
                }
            }
        `;

      const variables = {
        input: {
          id: ikasUser.ikasId,
          firstName: customerData.firstName || ikasUser.firstName,
          lastName: customerData.lastName || ikasUser.lastName,
          email: ikasUser.email,
          addresses: user.addresses.map((address: any) => ({
            title: address.title,
            firstName: address.firstName,
            lastName: address.lastName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            postalCode: address.postalCode || '34349',
            city: {
              id: address.city.id,
              name: address.city.name,
            },
            district: {
              id: address.district.id,
              name: address.district.name,
            },
            country: {
              id: address.country.id,
              name: address.country.name,
            },
          })),
        },
      };

      const response = await axios.post(
        this.ikasApiUrl,
        {
          query: mutation,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log('response', response.data.data);

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      console.log('address', response?.data?.data?.saveCustomer?.addresses);

      // IKAS'tan gelen Müşteri bilgileriyle kullanıcıyı güncelle
      const newUser = await this.userModel.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $set: {
            ikasCustomerId: response?.data?.data?.saveCustomer?.id,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            phone: customerData.phone,
            birthDate: customerData.birthDate,
            gender: customerData.gender,
            addresses: [...response?.data?.data?.saveCustomer?.addresses],
          },
        },
        {
          new: true,
        },
      );

      console.log('updated user', newUser);

      return newUser;
    } catch (error) {
      console.error('Müşteri güncellenirken hata:', error);
      throw new Error('Müşteri güncellenemedi: ' + error.message);
    }
  }

  async getCustomer(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const accessToken = await this.ikasService.getAccessToken();

      const query = `
                query GetCustomer($email: String!) {
                    customer(email: $email) {
                        id
                        fullName
                        firstName
                        email
                        birthDate
                        gender
                        lastName
                        phone
                        totalOrderPrice
                    }
                }
            `;

      const variables = {
        email: user.email,
      };

      const response = await axios.post(
        this.ikasApiUrl,
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.customer;
    } catch (error) {
      console.error('Müşteri bilgileri alınırken hata:', error);
      throw new Error('Müşteri bilgileri alınamadı: ' + error.message);
    }
  }
}
