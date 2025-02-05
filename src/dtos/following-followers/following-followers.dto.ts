import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class FollowingFollowersDto {
    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    following: string;
}
