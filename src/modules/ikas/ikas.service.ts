import { Injectable } from '@nestjs/common';

@Injectable()
export class IkasService {
    async getWebhooks() {
        return {
            "webhook": {
                "message": "Webhook received"
            }
        }

    }
}
