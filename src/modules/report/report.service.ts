import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import { Report, ReportDocument } from 'src/schemas/report.schema';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    ) { }

    async reportVideo(videoId: string, userId: string, reason: string) {
        // Check if user already reported this video
        const existingReport = await this.reportModel.findOne({
            video: videoId,
            reporter: userId,
        });

        if (existingReport) {
            throw new Error('You have already reported this video');
        }

        // Create report
        const report = await this.reportModel.create({
            video: videoId,
            reporter: userId,
            reason,
        });

        // Update video report count and status
        await this.videoModel.findByIdAndUpdate(videoId, {
            $inc: { reportCount: 1 },
            $set: { isReported: true },
        });

        return report;
    }
} 