import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IkasService } from 'src/services/ikas.service';
import { THE_NORTH_FACE_CHANNEL_ID } from 'src/utils/constants';

@Injectable()
export class BrandsService {
    constructor(
        private ikasService: IkasService
    ) { }

    async getBrands(page: number = 1, limit: number = 10) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            const query = `
                query {
                   listProductBrand {
                    id
                    name
                    createdAt
                    imageId
                    description
                    salesChannelIds
                   }
                }
            `;

            const response = await axios.post(
                'https://api.myikas.com/api/v1/admin/graphql',
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );

            console.log('Brands length', response.data.data.listProductBrand.length);

            const data = response.data.data.listProductBrand;


            const filterBrandByChannelId = data.filter((brand: any) => brand.salesChannelIds.includes(THE_NORTH_FACE_CHANNEL_ID));

            console.log('filterBrandByChannelId', filterBrandByChannelId.length);
            return filterBrandByChannelId;
        } catch (error) {
            console.error('Ürün listesi alma hatası:', error);
            throw error;
        }
    }
}
