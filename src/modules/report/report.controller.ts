import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('video')
  @UseGuards(JwtAuthGuard)
  async reportVideo(
    @Body() body: { videoId: string; userId: string; reason: string },
    @CurrentUser() currentUser,
  ) {
    return this.reportService.reportVideo(
      body.videoId,
      currentUser._id,
      body.reason,
    );
  }
}
