import { IsObject, IsString } from "class-validator";

export class AddFavoriteDto {
    @IsString()
    productId: string;

    @IsObject()
    product: any;
}