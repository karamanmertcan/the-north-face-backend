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

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
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

        await this.sendIkasWebhook();

        const payload = {
            id: newUser._id,
            email: newUser.email,
        }

        const token = this.jwtService.sign(payload);

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

    async registerWebhook(body: any) {
        console.log(body)
        return body;
    }

}
