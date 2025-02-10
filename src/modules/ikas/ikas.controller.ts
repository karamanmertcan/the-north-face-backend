import { Controller, Get, HttpCode } from '@nestjs/common';
import { IkasService } from './ikas.service';

@Controller('ikas')
export class IkasController {
  constructor(private readonly ikasService: IkasService) { }


  @Get('webhooks/orders')
  @HttpCode(200)
  async getWebhooks() {
    return this.ikasService.getWebhooks();
  }
}
