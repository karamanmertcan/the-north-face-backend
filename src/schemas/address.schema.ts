import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class City {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  id: string;
}

@Schema()
export class District {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  id: string;
}

@Schema()
export class Country {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  id: string;
}

@Schema()
export class Address {
  @Prop()
  id?: string;

  @Prop({ required: true })
  title: string; // Adres başlığı

  @Prop({ required: true })
  firstName: string; // Ad

  @Prop({ required: true })
  lastName: string; // Soyad

  @Prop({ required: true })
  addressLine1: string; // Adres

  @Prop({ required: false })
  apartment: string; // Apartman

  @Prop()
  postalCode?: string; // Posta Kodu

  @Prop({ type: Country, required: true })
  country: Country; // Ülke

  @Prop({ type: City, required: true })
  city: City; // Şehir

  @Prop({ type: District, required: true })
  district: District; // İlçe

  @Prop({ required: true })
  phone: string; // Telefon

  @Prop({ default: false })
  isDefault: boolean;
}

export type AddressDocument = Address & Document;
export const AddressSchema = SchemaFactory.createForClass(Address);
