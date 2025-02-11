import { Module } from '@nestjs/common';
import { IkasService } from './ikas.service';
import { IkasController } from './ikas.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { IkasUser, IkasUserSchema } from '../../schemas/ikas-user.schema';

@Module({
  controllers: [IkasController],
  providers: [IkasService],
  imports: [
    MongooseModule.forFeature([
      { name: IkasUser.name, schema: IkasUserSchema }
    ])
  ],
})
export class IkasModule { }
