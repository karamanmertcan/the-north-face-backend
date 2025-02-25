import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class IkasToken {
  @Prop()
  token: string;

  @Prop()
  tokenExpiry: number;
}

@Schema({ timestamps: true })
export class IkasUser extends Document {
  @Prop({ required: true })
  ikasId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  fullName: string;

  @Prop({ default: 'ACTIVE_ACCOUNT' })
  accountStatus: string;

  @Prop()
  accountStatusUpdatedAt: number;

  @Prop({ type: [Object], default: [] })
  addresses: any[];

  @Prop({ type: [Object], default: [] })
  attributes: any[];

  @Prop()
  birthDate: Date;

  @Prop()
  customerSequence: number;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  emailVerifiedDate: Date;

  @Prop()
  gender: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop()
  note: string;

  @Prop()
  orderCount: number;

  @Prop()
  passwordUpdateDate: Date;

  @Prop()
  phone: string;

  @Prop({ default: 'NOT_SUBSCRIBED' })
  phoneSubscriptionStatus: string;

  @Prop()
  phoneSubscriptionStatusUpdatedAt: number;

  @Prop()
  phoneVerifiedDate: Date;

  @Prop({ default: 'tr' })
  preferredLanguage: string;

  @Prop()
  priceListId: string;

  @Prop({ type: [Object], default: [] })
  priceListRules: any[];

  @Prop()
  registrationSource: string;

  @Prop({ default: 'NOT_SUBSCRIBED' })
  smsSubscriptionStatus: string;

  @Prop()
  smsSubscriptionStatusUpdatedAt: number;

  @Prop({ default: 'NOT_SUBSCRIBED' })
  subscriptionStatus: string;

  @Prop()
  subscriptionStatusUpdatedAt: number;

  @Prop({ type: [String], default: [] })
  tagIds: string[];

  @Prop({ type: Object })
  ikasToken: IkasToken;

  @Prop({ type: [String], default: [] })
  customerGroupIds: string[];

  @Prop({ type: [String], default: [] })
  customerSegmentIds: string[];
}

export type IkasUserDocument = IkasUser & Document;

export const IkasUserSchema = SchemaFactory.createForClass(IkasUser);

// İndexler ekleyelim
IkasUserSchema.index({ ikasId: 1 }, { unique: true });
IkasUserSchema.index({ email: 1 }, { unique: true });
