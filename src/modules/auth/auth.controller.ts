import { Body, Controller, Get, Post, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/dtos/auth/login.dto';
import { RegisterDto } from 'src/dtos/auth/register.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  LoginResponse,
  RegisterResponse,
  ErrorResponse,
} from 'src/models/responses/auth.response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'User login',
    description: 'Login with email and password',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
    type: LoginResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
    type: ErrorResponse,
  })
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: RegisterResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid data or email already exists',
    type: ErrorResponse,
  })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Get webhooks',
    description: 'Get all registered webhooks',
  })
  @ApiResponse({ status: 200, description: 'Returns list of webhooks' })
  @Get('webhooks')
  async getWebhooks() {
    return this.authService.getIkasWebhooks();
  }

  @ApiOperation({
    summary: 'Register webhook',
    description: 'Register a new webhook',
  })
  @ApiResponse({ status: 200, description: 'Webhook registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid webhook data',
    type: ErrorResponse,
  })
  @Post('webhook/register')
  @HttpCode(200)
  async registerWebhook(@Body() body: any) {
    return this.authService.registerWebhook(body);
  }
}
