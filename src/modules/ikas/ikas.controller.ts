import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IkasService } from './ikas.service';

@Controller('ikas')
export class IkasController {
  constructor(private readonly ikasService: IkasService) { }


  @Post('webhooks/orders')
  @HttpCode(200)
  async getWebhooks(@Body() body: any) {
    console.log(body)
    return this.ikasService.getWebhooks();
  }
}
