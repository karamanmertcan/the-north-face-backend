import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { IkasService } from 'src/services/ikas.service';
import {
  IkasUser,
  IkasUserSchema,
} from '../ikas-users/schemas/ikas-user.schema';
import { UuidModule } from 'nestjs-uuid';

@Module({
  imports: [
    ConfigModule,
    UuidModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: IkasUser.name, schema: IkasUserSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, IkasService],
  exports: [CustomersService],
})
export class CustomersModule {}
