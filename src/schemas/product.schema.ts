import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  ikasProductId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  vendorId: string;

  @Prop({ type: [{ type: Object }] })
  categories: Array<{
    id: string;
    name: string;
  }>;

  @Prop({ type: [{ type: Object }] })
  productVariantTypes: Array<{
    id: string;
    name: string;
    values: Array<{
      id: string;
      name: string;
    }>;
  }>;

  @Prop({ type: Object })
  brand: {
    id: string;
    name: string;
  };

  @Prop()
  brandId: string;

  @Prop({ type: [{ type: Object }] })
  tags: Array<{
    id: string;
    name: string;
  }>;

  @Prop({ type: [{ type: Object }] })
  variants: Array<{
    id: string;
    sku: string;
    barcode: string;
    price: number;
    compareAtPrice: number;
    weight: number;
    stockAmount: number;
    isActive?: boolean;
    images?: Array<{
      imageId: string;
      isMain?: boolean;
    }>;
    values: Array<{
      id: string;
      name: string;
      valueName: string;
    }>;
  }>;

  @Prop()
  createdAt: number;

  @Prop()
  updatedAt: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
