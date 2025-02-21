import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { IkasUsersModule } from '../ikas-users/ikas-users.module';
import { IkasModule } from '../ikas/ikas.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IkasUser, IkasUserSchema } from '../ikas-users/schemas/ikas-user.schema';
import { IkasService } from 'src/services/ikas.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: IkasUser.name, schema: IkasUserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
    IkasUsersModule,
    IkasModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, IkasService],
  exports: [AuthService],
})
export class AuthModule { }
