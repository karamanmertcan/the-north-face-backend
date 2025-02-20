import { Module } from '@nestjs/common';
import { IkasService } from './ikas.service';

@Module({
    providers: [IkasService],
    exports: [IkasService],
})
export class IkasModule { }
