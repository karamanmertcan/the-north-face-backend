import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { IkasService } from '../../services/ikas.service';
import { IkasUser, IkasUserSchema } from 'src/schemas/ikas-user.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: IkasUser.name, schema: IkasUserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, IkasService],
  exports: [JwtStrategy, PassportModule, IkasService],
})
export class AuthModule { }
