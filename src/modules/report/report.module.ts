import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from 'src/schemas/report.schema';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Video, VideoSchema } from 'src/schemas/video.schema';
@Module({
    imports: [
        MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
        MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),

    ],
    controllers: [ReportController],
    providers: [ReportService],
})
export class ReportModule { }
