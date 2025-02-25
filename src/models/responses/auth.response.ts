import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User information',
    example: {
      _id: '60d21b4667d0d8992e610c85',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      avatar: 'avatar-url',
    },
  })
  user: any;
}

export class RegisterResponse {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User information',
    example: {
      _id: '60d21b4667d0d8992e610c85',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
    },
  })
  user: any;
}

export class ErrorResponse {
  @ApiProperty({
    description: 'Error status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Bad Request',
  })
  message: string;

  @ApiProperty({
    description: 'Error details',
    example: ['email must be an email', 'password should not be empty'],
    required: false,
  })
  errors?: string[];
}
