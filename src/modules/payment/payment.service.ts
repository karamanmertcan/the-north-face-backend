import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from 'src/schemas/order.schema';

import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class PaymentService {
    private readonly apiUrl: string;
    private readonly merchantKey: string;
    private readonly appKey: string;
    private readonly appSecret: string;

    constructor(
        private configService: ConfigService,
        private ordersService: OrdersService,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) {
        this.apiUrl = this.configService.get('SIPAY_API_URL');
        this.merchantKey = this.configService.get('SIPAY_MERCHANT_KEY');
        this.appKey = this.configService.get('SIPAY_APP_KEY');
        this.appSecret = this.configService.get('SIPAY_APP_SECRET');
    }

    async getToken() {
        try {
            const response = await axios.post(`${this.apiUrl}/api/token`, {
                app_id: this.appKey,
                app_secret: this.appSecret
            });

            return response.data.data.token;
        } catch (error) {
            throw new Error('Token alınamadı');
        }
    }

    private generateHashKey(total: string, installment: string, currency_code: string, invoice_id: string) {
        try {
            const data = `${total}|${installment}|${currency_code}|${this.merchantKey}|${invoice_id}`;

            const iv = crypto.createHash('sha1')
                .update(String(Math.random()))
                .digest('hex')
                .slice(0, 16);

            const password = crypto.createHash('sha1')
                .update(this.appSecret)
                .digest('hex');

            const salt = crypto.createHash('sha1')
                .update(String(Math.random()))
                .digest('hex')
                .slice(0, 4);

            const salt_with_password = crypto.createHash('sha256')
                .update(password + salt)
                .digest('hex')
                .slice(0, 32);

            const cipher = crypto.createCipheriv('aes-256-cbc', salt_with_password, iv);
            let encrypted = cipher.update(data, 'binary', 'base64');
            encrypted += cipher.final('base64');

            const msg_encrypted_bundle = `${iv}:${salt}:${encrypted}`;
            return msg_encrypted_bundle.replace('/', '__');
        } catch (error) {
            console.error("Hash key oluşturma hatası:", error);
            return null;
        }
    }

    async create3DPayment(paymentData: any) {
        console.log("paymentData", paymentData);
        const user = await this.userModel.findById(paymentData.user_id);
        console.log("user", user);
        try {
            const hashKey = this.generateHashKey(
                paymentData.amount.toString(),
                '1',
                'TRY',
                paymentData.invoiceId
            );

            const appUrl = this.configService.get('APP_URL');
            const returnUrl = `${appUrl}/payment/callback`;
            const cancelUrl = `${appUrl}/payment/cancel`;

            console.log("hashKey", hashKey);
            console.log("returnUrl", returnUrl);
            console.log("cancelUrl", cancelUrl);

            // Custom parametreleri JSON olarak hazırla
            const customParams = {
                user_id: user._id.toString(),
                shipping_address: paymentData.shippingAddress,
                items: paymentData.items
            };

            const formHtml = `
                <form id="sipay_form" action="${this.apiUrl}/api/paySmart3D" method="POST">
                    <input type="hidden" name="merchant_key" value="${this.merchantKey}">
                    <input type="hidden" name="merchant_id" value="${this.configService.get('SIPAY_MERCHANT_ID')}">
                    <input type="hidden" name="currency_code" value="TRY">
                    <input type="hidden" name="invoice_id" value="${paymentData.invoiceId}">
                    <input type="hidden" name="invoice_description" value="${paymentData.description}">
                    <input type="hidden" name="total" value="${paymentData.amount}">
                    <input type="hidden" name="installments_number" value="1">
                    <input type="hidden" name="cc_holder_name" value="${paymentData.cardHolder}">
                    <input type="hidden" name="cc_no" value="${paymentData.cardNumber}">
                    <input type="hidden" name="expiry_month" value="${paymentData.expMonth}">
                    <input type="hidden" name="expiry_year" value="${paymentData.expYear}">
                    <input type="hidden" name="cvv" value="${paymentData.cvc}">
                    <input type="hidden" name="name" value="${paymentData.cardHolder.split(' ')[0]}">
                    <input type="hidden" name="surname" value="${paymentData.cardHolder.split(' ').slice(1).join(' ')}">
                    <input type="hidden" name="bill_email" value="${user.email}">
                    <input type="hidden" name="items" value='[{"name":"HikieWatch Payment","price":${paymentData.amount},"quantity":1}]'>
                    <input type="hidden" name="custom_params" value='${JSON.stringify(customParams)}'>
                    <input type="hidden" name="user_id" value="${user._id}">
                    <input type="hidden" name="return_url" value="${returnUrl}">
                    <input type="hidden" name="cancel_url" value="${cancelUrl}">
                    <input type="hidden" name="hash_key" value="${hashKey}">
                    <input type="hidden" name="response_method" value="POST">
                    <input type="hidden" name="bill_address1" value="Test Address">
                    <input type="hidden" name="bill_city" value="Istanbul">
                    <input type="hidden" name="bill_country" value="TR">
                </form>
                <script>
                    document.getElementById('sipay_form').submit();
                </script>
            `;

            console.log("formHtml", formHtml);

            return { html_content: formHtml };
        } catch (error) {
            console.error('3D Ödeme hatası:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || '3D Ödeme işlemi başarısız');
        }
    }

    async handle3DCallback(callbackData: any) {
        try {
            const {
                sipay_status,
                payment_id,
                order_id,
                invoice_id,
                error_code,
                status_description,
                amount,
                credit_card_no,
                custom_params
            } = callbackData;

            console.log('SİPARİŞ TAMAMLANDI');
            console.log('Callback Data:', callbackData);

            // Custom parametreleri parse et
            let userData;
            try {
                userData = JSON.parse(custom_params);
                console.log("Parsed Custom Params:", userData);
            } catch (error) {
                console.error("Custom params parse error:", error);
                throw new Error("Invalid custom params");
            }

            if (sipay_status === '1' && error_code === '100') {
                // Kendi DB'mizde order oluştur
                const order = await this.orderModel.create({
                    userId: userData.user_id,
                    orderNumber: `HS-${Date.now()}`,
                    totalAmount: amount,
                    items: userData.items,
                    shippingAddress: userData.shipping_address,
                    status: 'processing',
                    paymentId: payment_id,
                    isPaid: true,
                    ikasOrderId: order_id,
                    paidAt: new Date()
                });

                console.log("Created Order:", order);

                // İkas'ta order oluştur
                const ikasOrder = await this.ordersService.createOrder({
                    orderData: userData.items,
                    items: userData.items,
                    shippingAddress: userData.shipping_address,
                    userId: userData.user_id,
                });

                console.log("Created Ikas Order:", ikasOrder);

                // Kendi order'ımızı İkas order ID ile güncelle
                await order.updateOne({
                    ikasOrderId: ikasOrder.id
                });

                return {
                    success: true,
                    payment_id: payment_id,
                    order_id: order.orderNumber,
                    ikas_order_id: ikasOrder.id,
                    invoice_id,
                    amount,
                    card_no: credit_card_no,
                    message: status_description
                };
            } else {
                throw new Error('Ödeme işlemi başarısız');
            }
        } catch (error) {
            console.error('3D Callback hatası:', error);
            throw error;
        }
    }
} 