import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IkasService {
    private readonly ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
    private ikasAccessToken: string | null = null;
    private tokenExpiryTime: number | null = null;

    constructor(
        private configService: ConfigService,
    ) { }

    async getAccessToken() {
        try {
            const currentTime = Date.now();
            if (this.ikasAccessToken && this.tokenExpiryTime && currentTime < this.tokenExpiryTime) {
                return this.ikasAccessToken;
            }

            const storeName = 'hikiespace';
            const clientId = this.configService.get('IKAS_CLIENT_ID');
            const clientSecret = this.configService.get('IKAS_CLIENT_SECRET');

            const response = await axios.post(
                `https://${storeName}.myikas.com/api/admin/oauth/token`,
                {
                    grant_type: 'client_credentials',
                    client_id: clientId,
                    client_secret: clientSecret
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.ikasAccessToken = response.data.access_token;
            this.tokenExpiryTime = currentTime + (60 * 60 * 1000); // 1 saat

            return this.ikasAccessToken;
        } catch (error) {
            console.error('İkas token alma hatası:', error);
            throw error;
        }
    }
} 