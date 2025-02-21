import { Body, Controller, Get, Post, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/dtos/auth/login.dto';
import { RegisterDto } from 'src/dtos/auth/register.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('webhooks')
    async getWebhooks() {
        return this.authService.getIkasWebhooks();
    }

    @Post('webhook/register')
    @HttpCode(200)
    async registerWebhook(@Body() body: any) {
        return this.authService.registerWebhook(body);
    }
}
