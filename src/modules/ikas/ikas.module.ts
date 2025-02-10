import { Module } from '@nestjs/common';
import { IkasService } from './ikas.service';
import { IkasController } from './ikas.controller';

@Module({
  controllers: [IkasController],
  providers: [IkasService],
})
export class IkasModule {}
