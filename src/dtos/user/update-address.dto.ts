import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateUserAddressDto {
    @IsString()
    @IsOptional()
    addressLine1: string;

    @IsString()
    @IsOptional()
    addressLine2: string;

    @IsObject()
    @IsOptional()
    city: {
        id: string;
        name: string;
    };

    @IsObject()
    @IsOptional()
    country: {
        id: string;
        name: string;
    };

    @IsObject()
    @IsOptional()
    district: {
        id: string;
        name: string;
    };

    @IsString()
    @IsOptional()
    postalCode: string;

    @IsString()
    @IsOptional()
    phone: string;

    @IsBoolean()
    @IsOptional()
    isDefault: boolean;

    @IsString()
    @IsOptional()
    title: string;

    @IsString()
    @IsOptional()
    firstName: string;

    @IsString()
    @IsOptional()
    lastName: string;

    @IsString()
    @IsOptional()
    apartment: string;
}
