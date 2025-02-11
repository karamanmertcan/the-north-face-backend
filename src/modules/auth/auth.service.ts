import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { RegisterDto } from 'src/dtos/auth/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { generateUsername } from 'src/utils/generate-username';
import { LoginDto } from 'src/dtos/auth/login.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IkasService } from '../../services/ikas.service';
import { IkasUser, IkasUserDocument } from 'src/schemas/ikas-user.schema';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(IkasUser.name) private ikasUserModel: Model<IkasUserDocument>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private ikasService: IkasService,
    ) { }

    private async sendIkasWebhook() {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const mutation = `
                mutation DeleteWebhook($input: WebhookInput!) {
                    deleteWebhook(input: $input) {
                        id
                        scope
                        endpoint
                        createdAt
                        updatedAt
                        deleted
                    }
                }
            `;

            const variables = {
                input: {
                    scopes: ["store/customer/updated", "store/order/created"],
                }
            };

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                {
                    query: mutation,
                    variables
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            console.log('İkas webhook kaydı başarılı:', response.data);
        } catch (error) {
            console.error('İkas webhook hatası:', error);
        }
    }

    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName } = registerDto;

        const user = await this.userModel.findOne({ email });
        if (user) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new this.userModel({ email, password: hashedPassword, firstName, lastName, username: generateUsername(firstName, lastName, email) });

        await newUser.save();

        // await this.sendIkasWebhook();

        const payload = {
            id: newUser._id,
            email: newUser.email,
        }

        const token = this.jwtService.sign(payload);

        //create ikas user
        const ikasUser = await this.ikasService.createIkasUser({
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            password,
            isAcceptMarketing: false,
            captchaToken: null,
            phone: null,
        });

        console.log(ikasUser)


        if (ikasUser) {
            await this.ikasUserModel.create({
                firstName: ikasUser.customer.firstName,
                lastName: ikasUser.customer.lastName,
                email: ikasUser.customer.email,
                ikasId: ikasUser.customer.id,
            })
        }


        return {
            user: newUser,
            token: token,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new BadRequestException('Invalid password');
        }

        const payload = {
            id: user._id,
            email: user.email,
        }

        const userData = {
            ...user.toObject(),
            password: undefined,
        }

        console.log(userData)

        const token = this.jwtService.sign(payload);

        return {
            user: userData,
            token: token,
        };
    }

    async getIkasWebhooks() {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                    listWebhook {
                        createdAt
                        deleted
                        endpoint
                        id
                        scope
                        updatedAt
                    }
                }
            `;

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            console.log('İkas webhook listesi:', response.data);
            return response.data;
        } catch (error) {
            console.error('İkas webhook listesi alma hatası:', error);
            throw new Error('Webhook listesi alınamadı');
        }
    }


    async getMe() {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                    me {
                        id
                    }
                }
            `;

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            console.log('İkas webhook listesi:', response.data);
            return response.data;
        } catch (error) {
            console.error('İkas webhook listesi alma hatası:', error);
            throw new Error('Webhook listesi alınamadı');
        }
    }

    async registerWebhook(webhookData: any) {
        try {
            // Gelen data string olarak geliyor, JSON'a çevirelim
            const data = JSON.parse(webhookData.data);

            console.log('webhookData', webhookData)

            console.log('data 2', data)

            switch (webhookData.scope) {
                case 'store/customer/created':
                    // Yeni kullanıcı oluşturma
                    const newIkasUser = await this.ikasUserModel.create({
                        ikasId: data.id,
                        email: data.email,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        fullName: data.fullName,
                        accountStatus: data.accountStatus,
                        accountStatusUpdatedAt: new Date(data.accountStatusUpdatedAt).getTime(),
                        addresses: data.addresses,
                        attributes: data.attributes,
                        customerSequence: data.customerSequence,
                        deleted: data.deleted,
                        emailVerifiedDate: data.emailVerifiedDate,
                        isEmailVerified: data.isEmailVerified,
                        isPhoneVerified: data.isPhoneVerified,
                        phone: data.phone,
                        phoneSubscriptionStatus: data.phoneSubscriptionStatus,
                        phoneSubscriptionStatusUpdatedAt: new Date(data.phoneSubscriptionStatusUpdatedAt).getTime(),
                        preferredLanguage: data.preferredLanguage,
                        registrationSource: data.registrationSource,
                        smsSubscriptionStatus: data.smsSubscriptionStatus,
                        smsSubscriptionStatusUpdatedAt: new Date(data.smsSubscriptionStatusUpdatedAt).getTime(),
                        subscriptionStatus: data.subscriptionStatus,
                        subscriptionStatusUpdatedAt: new Date(data.subscriptionStatusUpdatedAt).getTime(),
                        tagIds: data.tagIds,
                        customerGroupIds: data.customerGroupIds,
                        customerSegmentIds: data.customerSegmentIds
                    });



                    return newIkasUser;

                case 'store/customer/updated':


                    // Mevcut kullanıcıyı güncelle
                    const updatedIkasUser = await this.ikasUserModel.findOneAndUpdate(
                        { ikasId: data.id },
                        {
                            email: data.email,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            fullName: data.fullName,
                            accountStatus: data.accountStatus,
                            accountStatusUpdatedAt: new Date(data.accountStatusUpdatedAt).getTime(),
                            addresses: data.addresses,
                            attributes: data.attributes,
                            customerSequence: data.customerSequence,
                            deleted: data.deleted,
                            emailVerifiedDate: data.emailVerifiedDate,
                            isEmailVerified: data.isEmailVerified,
                            isPhoneVerified: data.isPhoneVerified,
                            phone: data.phone,
                            phoneSubscriptionStatus: data.phoneSubscriptionStatus,
                            phoneSubscriptionStatusUpdatedAt: new Date(data.phoneSubscriptionStatusUpdatedAt).getTime(),
                            preferredLanguage: data.preferredLanguage,
                            registrationSource: data.registrationSource,
                            smsSubscriptionStatus: data.smsSubscriptionStatus,
                            smsSubscriptionStatusUpdatedAt: new Date(data.smsSubscriptionStatusUpdatedAt).getTime(),
                            subscriptionStatus: data.subscriptionStatus,
                            subscriptionStatusUpdatedAt: new Date(data.subscriptionStatusUpdatedAt).getTime(),
                            tagIds: data.tagIds,
                            customerGroupIds: data.customerGroupIds,
                            customerSegmentIds: data.customerSegmentIds
                        },
                        { new: true, upsert: true }
                    );



                    return updatedIkasUser;

                default:
                    console.log('Bilinmeyen webhook scope:', webhookData.scope);
                    return null;
            }
        } catch (error) {
            console.error('Webhook işleme hatası:', error);
            throw error;
        }
    }

}
