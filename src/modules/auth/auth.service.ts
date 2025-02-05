import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { RegisterDto } from 'src/dtos/auth/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { generateUsername } from 'src/utils/generate-username';
import { LoginDto } from 'src/dtos/auth/login.dto';


@Injectable()
export class AuthService {


    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) { }


    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName } = registerDto;

        const user = await this.userModel.findOne({ email });
        if (user) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new this.userModel({ email, password: hashedPassword, firstName, lastName, username: generateUsername(firstName, lastName, email) });

        await newUser.save();

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

}
