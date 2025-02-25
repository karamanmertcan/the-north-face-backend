import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IkasUsersService } from './ikas-users.service';
import { IkasUser, IkasUserSchema } from './schemas/ikas-user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IkasUser.name, schema: IkasUserSchema },
    ]),
  ],
  providers: [IkasUsersService],
  exports: [IkasUsersService],
})
export class IkasUsersModule {}
