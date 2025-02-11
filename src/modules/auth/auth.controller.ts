import { Body, Controller, Post, Get, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/dtos/auth/register.dto';
import { LoginDto } from 'src/dtos/auth/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }


  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('webhooks')
  async getWebhooks() {
    return this.authService.getIkasWebhooks();
  }

  @Post('me')
  async getMe() {
    return this.authService.getMe();
  }


  @Post('webhook')
  async handleWebhook(@Body() webhookData: any) {
    return this.authService.registerWebhook(webhookData);
  }
}
