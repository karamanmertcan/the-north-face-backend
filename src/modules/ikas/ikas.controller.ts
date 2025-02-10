import { Controller, Get } from '@nestjs/common';
import { IkasService } from './ikas.service';

@Controller('ikas')
export class IkasController {
  constructor(private readonly ikasService: IkasService) { }


  @Get('webhooks/orders')
  async getWebhooks() {
    return this.ikasService.getWebhooks();
  }
}
