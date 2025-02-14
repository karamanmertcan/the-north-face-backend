import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { Video, VideoDocument } from 'src/schemas/video.schema';
import { FollowersFollowings, FollowersFollowingsDocument } from 'src/schemas/followers-followings.schema';
import { UpdateUserDto } from 'src/dtos/user/update-user.dto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getS3Config } from 'src/config/s3.config';
import { ConfigService } from '@nestjs/config';
import { LikeVideo, LikeVideoDocument } from 'src/schemas/like-video.schema';
import { Favorite, FavoriteDocument } from 'src/schemas/favorite.schema';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { UpdateUserAddressDto } from 'src/dtos/user/update-address.dto';

@Injectable()
export class UsersService {

    private s3Client: S3Client;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        @InjectModel(FollowersFollowings.name) private followersFollowingsModel: Model<FollowersFollowingsDocument>,
        @InjectModel(LikeVideo.name) private likeVideoModel: Model<LikeVideoDocument>,
        @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
        private configService: ConfigService,
    ) {
        this.s3Client = getS3Config(configService);
    }

    getUser(userId: string) {
        return this.userModel.findById({
            _id: userId
        }).select('-password').lean();
    }

    async getUserProfileWithVideos(userId: string) {
        const user = await this.userModel.findById({
            _id: userId
        }).select('-password').lean();

        const videos = await this.videoModel.find({
            creator: userId
        }).lean();

        const followers = await this.followersFollowingsModel.find({
            following: userId
        }).countDocuments().lean();

        const following = await this.followersFollowingsModel.find({
            follower: userId
        }).countDocuments().lean();

        const likedVideos = await this.videoModel.find({
            creator: userId
        }).lean();

        const countTotalLikesOfUserVideos = likedVideos.reduce((acc, video) => acc + video.likedBy.length, 0);

        const favorites = await this.favoriteModel.find({
            user: userId
        }).lean();


        return {
            user,
            videos,
            followers,
            following,
            countTotalLikesOfUserVideos,
            favorites
        }

    }

    getUserByIkasId(ikasId: string) {
        return this.userModel.findOne({ ikasId }).lean();
    }

    createUser(user: User) {
        return this.userModel.create(user);
    }


    async getUserVideos(userId: string) {
        return this.videoModel.find({
            creator: userId
        }).lean();
    }


    async updateUser(userId: string, updateUserDto: UpdateUserDto) {
        if (updateUserDto.username) {
            const user = await this.userModel.findOne({ username: updateUserDto.username }).lean();
            if (user) {
                throw new BadRequestException('Kullanıcı adı zaten kullanılıyor.');
            }
        }

        const user = await this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true }).lean();


        return user;
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        try {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.configService.get('AWS_BUCKET_NAME'),
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const avatarUrl = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileName}`;


            const updatedUser = await this.userModel.findByIdAndUpdate(
                userId,
                { avatar: avatarUrl },
                { new: true }
            );

            return updatedUser;
        } catch (error) {
            console.error('Avatar yükleme hatası:', error);
            throw new Error('Avatar yüklenemedi');
        }
    }

    async getUserProfile(userId: string) {
        const user = await this.userModel.findById({
            _id: userId
        }).select('-password').lean();

        const videos = await this.videoModel.find({
            creator: userId
        }).lean();

        const followers = await this.followersFollowingsModel.find({
            following: userId
        }).countDocuments().lean();

        const following = await this.followersFollowingsModel.find({
            follower: userId
        }).countDocuments().lean();

        const favorites = await this.favoriteModel.find({
            user: userId
        }).lean();

        return {
            user,
            videos,
            followers,
            following,
            favorites
        }

    }

    async getUserProfileById(userId: string, currentUserId: string) {
        try {
            const user = await this.userModel.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Kullanıcının takip edilip edilmediğini kontrol et
            const isFollowing = await this.followersFollowingsModel.findOne({
                follower: currentUserId,
                following: userId
            });

            const videos = await this.videoModel.find({ creator: userId });
            const followers = await this.followersFollowingsModel.countDocuments({ following: userId });
            const following = await this.followersFollowingsModel.countDocuments({ follower: userId });

            return {
                user: {
                    ...user.toObject(),
                    isFollowing: !!isFollowing // boolean değer olarak dön
                },
                videos,
                followers,
                following
            };
        } catch (error) {
            throw error;
        }
    }


    async getUserAddresses(userId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user.addresses;
    }

    async addAddress(userId: string, addressData: any) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Eğer yeni adres varsayılan olarak işaretlendiyse, diğer adreslerin varsayılan değerini false yap
        if (addressData.isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        // Eğer bu ilk adresse, varsayılan olarak işaretle
        if (user.addresses.length === 0) {
            addressData.isDefault = true;
        }

        addressData.id = uuidv4(); // Benzersiz ID oluştur
        user.addresses.push(addressData);
        await user.save();
        return addressData;
    }

    async updateAddress(userId: string, addressId: string, addressData: any) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        console.log('addressData', addressData)
        console.log('addressId', addressId)

        const addressIndex = user.addresses.findIndex((addr: any) => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            throw new NotFoundException('Address not found');
        }

        // Eğer yeni adres varsayılan olarak işaretlendiyse, diğer adreslerin varsayılan değerini false yap
        if (addressData.isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        user.addresses[addressIndex] = {
            ...user.addresses[addressIndex],
            ...addressData
        };

        await user.save();
        return user.addresses[addressIndex];
    }

    async deleteAddress(userId: string, addressId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
        if (addressIndex === -1) {
            throw new NotFoundException('Address not found');
        }

        const deletedAddress = user.addresses.splice(addressIndex, 1)[0];

        // Eğer silinen adres varsayılan adresse ve başka adresler varsa
        // ilk adresi varsayılan yap
        if (deletedAddress.isDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();
        return { success: true };
    }

    async setDefaultAddress(userId: string, addressId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
        if (addressIndex === -1) {
            throw new NotFoundException('Address not found');
        }

        // Tüm adreslerin varsayılan değerini false yap
        user.addresses.forEach(address => {
            address.isDefault = false;
        });

        // Seçilen adresi varsayılan yap
        user.addresses[addressIndex].isDefault = true;

        await user.save();
        return user.addresses[addressIndex];
    }

    async getCountries() {
        try {
            const query = `
                query listCountry($locale: String) {
                    listCountry(locale: $locale) {
                        id
                        name
                        iso2
                        iso3
                        phoneCode
                        currency
                        currencyCode
                        currencySymbol
                        emoji
                        locationTranslations {
                            tr
                        }
                    }
                }
            `;

            const response = await axios.post('https://api.myikas.com/api/sf/graphql', {
                query,
                variables: {
                    locale: 'tr'
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtIjoiZjkyOTFmNDctZDY1Ny00NTY5LTlhNGUtZTJmNjRhYmVkMjA3Iiwic2YiOiI1YmRmYmYzYi1lOWVmLTQ3ZjMtYmYzYi03MjlhNjcwYjMyZTgiLCJzZnQiOjEsInNsIjoiZWE3NTUyOWItNDU3MC00MTk5LWFlZjEtMzE5YTNiN2FhNGU3In0.NfVRBrkyqXQuDmrGdlFTf9X3oYBECDaBEpkV72d7eXc"
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }


            // Sadece gerekli bilgileri içeren basitleştirilmiş bir liste döndür
            return response.data.data.listCountry

        } catch (error) {
            console.error('Ülke listesi alınırken hata:', error);
            throw new Error('Ülke listesi alınamadı');
        }
    }

    async getCities(countryId: string) {
        try {
            const query = `
                query ListCity($stateId: StringFilterInput!, $countryId: StringFilterInput) {
                    listCity(stateId: $stateId, countryId: $countryId) {
                        id
                        cityCode
                        name
                    }
                }
            `;

            const response = await axios.post('https://api.myikas.com/api/v1/admin/graphql', {
                query,
                variables: {
                    stateId: {
                        eq: "dcb9135c-4b84-4c06-9a42-f359317a9b78"
                    },
                    countryId: {
                        eq: countryId
                    }
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtIjoiZjkyOTFmNDctZDY1Ny00NTY5LTlhNGUtZTJmNjRhYmVkMjA3Iiwic2YiOiI1YmRmYmYzYi1lOWVmLTQ3ZjMtYmYzYi03MjlhNjcwYjMyZTgiLCJzZnQiOjEsInNsIjoiZWE3NTUyOWItNDU3MC00MTk5LWFlZjEtMzE5YTNiN2FhNGU3In0.NfVRBrkyqXQuDmrGdlFTf9X3oYBECDaBEpkV72d7eXc"
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }


            return response.data.data.listCity;

        } catch (error) {
            console.error('Şehir listesi alınırken hata:', error);
            throw new Error('Şehir listesi alınamadı');
        }
    }

    async getDistricts(cityId: string) {
        try {
            const query = `
                query ListDistrict($cityId: StringFilterInput!, $stateId: StringFilterInput) {
                    listDistrict(cityId: $cityId, stateId: $stateId) {
                        id
                        name
                    }
                }
            `;

            const response = await axios.post('https://api.myikas.com/api/v1/admin/graphql', {
                query,
                variables: {
                    cityId: {
                        eq: cityId
                    },
                    stateId: {
                        eq: "dcb9135c-4b84-4c06-9a42-f359317a9b78"
                    }
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtIjoiZjkyOTFmNDctZDY1Ny00NTY5LTlhNGUtZTJmNjRhYmVkMjA3Iiwic2YiOiI1YmRmYmYzYi1lOWVmLTQ3ZjMtYmYzYi03MjlhNjcwYjMyZTgiLCJzZnQiOjEsInNsIjoiZWE3NTUyOWItNDU3MC00MTk5LWFlZjEtMzE5YTNiN2FhNGU3In0.NfVRBrkyqXQuDmrGdlFTf9X3oYBECDaBEpkV72d7eXc"
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            return response.data.data.listDistrict;

        } catch (error) {
            console.error('İlçe listesi alınırken hata:', error);
            throw new Error('İlçe listesi alınamadı');
        }
    }


    async updateUserAddress(userId: string, addressId: string, updateUserAddressDto: UpdateUserAddressDto) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // _id ile arama yapalım
        const addressIndex = user.addresses.findIndex((addr: any) => addr._id.toString() === addressId);

        if (addressIndex === -1) {
            throw new NotFoundException('Address not found');
        }

        // Eğer yeni adres varsayılan olarak işaretlendiyse, diğer adreslerin varsayılan değerini false yap
        if (updateUserAddressDto.isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        // Gelen veriyi Address tipine uygun şekilde dönüştür
        const updatedAddress = {
            ...user.addresses[addressIndex],
            ...updateUserAddressDto,
            country: {
                name: updateUserAddressDto.country.name,
                id: updateUserAddressDto.country.id
            },
            city: {
                name: updateUserAddressDto.city.name,
                id: updateUserAddressDto.city.id
            },
            district: {
                name: updateUserAddressDto.district.name,
                id: updateUserAddressDto.district.id
            }
        };

        user.addresses[addressIndex] = updatedAddress;
        await user.save();
        return user.addresses[addressIndex];
    }

    async deleteUserAddress(userId: string, addressId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }


        const addressIndex = user.addresses.findIndex((addr: any) => addr._id.toString() === addressId);

        if (addressIndex === -1) {
            throw new NotFoundException('Address not found');
        }

        user.addresses.splice(addressIndex, 1);
        await user.save();
    }

}
