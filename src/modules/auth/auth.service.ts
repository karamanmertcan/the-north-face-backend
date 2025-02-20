import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
import { IkasUser, IkasUserDocument } from '../ikas-users/schemas/ikas-user.schema';
import { IkasService } from 'src/services/ikas.service';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(IkasUser.name) private ikasUserModel: Model<IkasUserDocument>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private ikasService: IkasService,
    ) { }

    // private async sendIkasWebhook() {
    //     try {
    //         const accessToken = await this.ikasService.getAccessToken();

    //         const mutation = `
    //             mutation DeleteWebhook($input: WebhookInput!) {
    //                 deleteWebhook(input: $input) {
    //                     id
    //                     scope
    //                     endpoint
    //                     createdAt
    //                     updatedAt
    //                     deleted
    //                 }
    //             }
    //         `;

    //         const variables = {
    //             input: {
    //                 scopes: ["store/customer/updated", "store/order/created"],
    //             }
    //         };

    //         const response = await axios.post(
    //             'https://api.myikas.com/api/v1/admin/graphql',
    //             {
    //                 query: mutation,
    //                 variables
    //             },
    //             {
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'Authorization': `Bearer ${accessToken}`,
    //                 }
    //             }
    //         );

    //         console.log('İkas webhook kaydı başarılı:', response.data);
    //     } catch (error) {
    //         console.error('İkas webhook hatası:', error);
    //     }
    // }

    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName } = registerDto;

        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        try {
            // Try to register with IKAS first
            const ikasResponse = await this.ikasService.createIkasUser({
                email,
                password,
                firstName,
                lastName,
                isAcceptMarketing: true,
                captchaToken: null,
                phone: ''
            });

            console.log('deneme user', ikasResponse)



            if (ikasResponse?.customer) {
                const ikasCustomer = ikasResponse.customer;
                const ikasToken = {
                    token: ikasResponse.token,
                    tokenExpiry: ikasResponse.tokenExpiry
                };

                // Create IKAS user in our database
                const ikasUser = await this.ikasUserModel.create({
                    ikasId: ikasCustomer.id,
                    email: ikasCustomer.email,
                    firstName: ikasCustomer.firstName,
                    lastName: ikasCustomer.lastName,
                    fullName: ikasCustomer.fullName || `${ikasCustomer.firstName} ${ikasCustomer.lastName}`,
                    phone: ikasCustomer.phone,
                    gender: ikasCustomer.gender,
                    birthDate: ikasCustomer.birthDate,
                    isEmailVerified: ikasCustomer.isEmailVerified,
                    isPhoneVerified: ikasCustomer.isPhoneVerified,
                    accountStatus: ikasCustomer.accountStatus,
                    preferredLanguage: ikasCustomer.preferredLanguage,
                    addresses: ikasCustomer.addresses,
                    ikasToken
                });

                // Generate a username from email (before the @ symbol)
                const username = email.split('@')[0];

                // Check if username exists
                const usernameExists = await this.userModel.findOne({ username });

                // If username exists, append a random number
                const finalUsername = usernameExists
                    ? `${username}${Math.floor(Math.random() * 1000)}`
                    : username;

                // Create main user
                const hashedPassword = await bcrypt.hash(password, 10);
                const user = await this.userModel.create({
                    email,
                    username: finalUsername,
                    password: hashedPassword,
                    firstName: ikasCustomer.firstName,
                    lastName: ikasCustomer.lastName,
                    ikasUserId: ikasUser._id,
                });

                const payload = {
                    email: user.email,
                    id: user._id,
                };

                return {
                    token: this.jwtService.sign(payload),
                    user: user
                };
            }
        } catch (error) {
            console.error('IKAS registration error:', error);
            // Continue with local registration if IKAS fails
        }

        // If IKAS registration fails, create local user only
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName
        });

        const payload = { email: user.email, sub: user._id };
        return {
            token: this.jwtService.sign(payload),
            user: user
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const validatedUser = await this.validateUser(email, password);
        console.log('validatedUser', validatedUser);
        if (!validatedUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            email: validatedUser.email,
            id: validatedUser._id,
        };

        const userData = {
            ...validatedUser,
        }

        console.log('userData', validatedUser)


        return {
            token: this.jwtService.sign(payload),
            user: validatedUser
        };
    }

    async validateUser(email: string, pass: string): Promise<any> {
        try {
            // First try IKAS login
            const ikasResponse = await this.ikasService.customerLogin(email, pass);

            console.log('ikasResponse', ikasResponse);

            if (ikasResponse?.data?.customerLogin?.customer) {
                const ikasCustomer = ikasResponse.data.customerLogin.customer;
                const ikasToken = {
                    token: ikasResponse.data.customerLogin.token,
                    tokenExpiry: ikasResponse.data.customerLogin.tokenExpiry
                };

                // Check if IKAS user exists in our database
                let ikasUser = await this.ikasUserModel.findOne({ ikasId: ikasCustomer.id });

                if (ikasUser) {
                    // Update existing IKAS user
                    ikasUser = await this.ikasUserModel.findOneAndUpdate(
                        { ikasId: ikasCustomer.id },
                        {
                            email: ikasCustomer.email,
                            firstName: ikasCustomer.firstName,
                            lastName: ikasCustomer.lastName,
                            fullName: ikasCustomer.fullName,
                            phone: ikasCustomer.phone,
                            gender: ikasCustomer.gender,
                            birthDate: ikasCustomer.birthDate,
                            isEmailVerified: ikasCustomer.isEmailVerified,
                            isPhoneVerified: ikasCustomer.isPhoneVerified,
                            accountStatus: ikasCustomer.accountStatus,
                            preferredLanguage: ikasCustomer.preferredLanguage,
                            addresses: ikasCustomer.addresses,
                            ikasToken
                        },
                        { new: true }
                    );
                } else {
                    // Create new IKAS user
                    ikasUser = await this.ikasUserModel.create({
                        ikasId: ikasCustomer.id,
                        email: ikasCustomer.email,
                        firstName: ikasCustomer.firstName,
                        lastName: ikasCustomer.lastName,
                        fullName: ikasCustomer.fullName,
                        phone: ikasCustomer.phone,
                        gender: ikasCustomer.gender,
                        birthDate: ikasCustomer.birthDate,
                        isEmailVerified: ikasCustomer.isEmailVerified,
                        isPhoneVerified: ikasCustomer.isPhoneVerified,
                        accountStatus: ikasCustomer.accountStatus,
                        preferredLanguage: ikasCustomer.preferredLanguage,
                        addresses: ikasCustomer.addresses,
                        ikasToken
                    });
                }

                // Check if user exists in our main users collection
                let user = await this.userModel.findOne({ email });

                if (!user) {
                    // Generate a username from email (before the @ symbol)
                    const username = email.split('@')[0];

                    // Check if username exists
                    const usernameExists = await this.userModel.findOne({ username });

                    // If username exists, append a random number
                    const finalUsername = usernameExists
                        ? `${username}${Math.floor(Math.random() * 1000)}`
                        : username;

                    // Create user in our database
                    user = await this.userModel.create({
                        email,
                        username: finalUsername,
                        password: await bcrypt.hash(pass, 10),
                        firstName: ikasCustomer.firstName,
                        lastName: ikasCustomer.lastName,
                        ikasUserId: ikasUser.id
                    });
                }



                return {
                    user: user,
                    ikasToken: ikasToken.token // Just return the token string for JWT
                };
            }
        } catch (error) {
            console.error('IKAS validation error:', error);
        }

        // If IKAS login fails or error occurs, try local login
        const user = await this.userModel.findOne({ email });
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user.toObject();
            return result;
        }

        return null;
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
