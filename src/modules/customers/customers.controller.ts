import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user';

@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @UseGuards(JwtAuthGuard)
    @Post('save')
    async saveCustomer(@CurrentUser() currentUser, @Body() customerData: any) {
        return this.customersService.saveCustomer(currentUser._id, customerData);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getCustomer(@CurrentUser() currentUser) {
        return this.customersService.getCustomer(currentUser._id);
    }
} 