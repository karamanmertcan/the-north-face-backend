import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  video: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporter: Types.ObjectId;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: 'pending', enum: ['pending', 'reviewed', 'ignored'] })
  status: string;

  @Prop({ default: false })
  isResolved: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
