import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IkasService } from 'src/services/ikas.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class CustomersService {
    private readonly ikasApiUrl: string;

    constructor(
        private configService: ConfigService,
        private ikasService: IkasService,
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) {
        this.ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
    }

    async saveCustomer(userId: string, customerData: any) {
        console.log('saveCustomer', customerData, userId);
        try {
            const user = await this.userModel.findById(userId);
            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            const accessToken = await this.ikasService.getAccessToken();

            const mutation = `
            mutation saveMyCustomer($input: SaveMyCustomerInput!) {
                saveMyCustomer(input: $input) {
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

            console.log('Customer Data:', customerData);

            const variables = {
                input: {
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    // phone: customerData.phone,
                    birthDate: customerData.birthDate,
                    gender: customerData.gender,
                    phoneSubscriptionStatus: "SUBSCRIBED",
                    smsSubscriptionStatus: "SUBSCRIBED",
                    subscriptionStatus: "SUBSCRIBED",
                    addresses: customerData.addresses || [],
                    attributes: []
                }
            };

            const response = await axios.post(this.ikasApiUrl, {
                query: mutation,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            // IKAS'tan gelen müşteri bilgileriyle kullanıcıyı güncelle
            await this.userModel.findByIdAndUpdate(userId, {
                $set: {
                    ikasCustomerId: response.data.data.saveMyCustomer.id,
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    phone: customerData.phone,
                    birthDate: customerData.birthDate,
                    gender: customerData.gender
                }
            });

            return response.data.data.saveMyCustomer;
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
                email: user.email
            };

            const response = await axios.post(this.ikasApiUrl, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

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