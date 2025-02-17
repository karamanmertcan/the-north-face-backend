import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from 'src/schemas/order.schema';
import { PendingOrder, PendingOrderDocument } from 'src/schemas/pending-order.schema';
import { Model } from 'mongoose';

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
        @InjectModel(PendingOrder.name) private pendingOrderModel: Model<PendingOrderDocument>
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
        try {
            // Ödeme başlamadan önce pending order oluştur
            const pendingOrder = await this.pendingOrderModel.create({
                invoiceId: paymentData.invoiceId,
                userId: paymentData.user_id,
                items: paymentData.items,
                shippingAddress: paymentData.shippingAddress,
                status: 'pending',
                shippingMethod: paymentData.shippingMethod
            });

            console.log("Created Pending Order:", pendingOrder);

            const hashKey = this.generateHashKey(
                '1',
                '1',
                'TRY',
                paymentData.invoiceId
            );

            const appUrl = this.configService.get('APP_URL');

            const returnUrl = `http://10.1.1.46:3000/payment/callback`;
            const cancelUrl = `http://10.1.1.46:3000/payment/cancel`;

            console.log("hashKey", hashKey);
            console.log("returnUrl", returnUrl);
            console.log("cancelUrl", cancelUrl);

            const formHtml = `
                <form id="sipay_form" action="${this.apiUrl}/api/paySmart3D" method="POST">
                    <input type="hidden" name="merchant_key" value="${this.merchantKey}">
                    <input type="hidden" name="merchant_id" value="${this.configService.get('SIPAY_MERCHANT_ID')}">
                    <input type="hidden" name="currency_code" value="TRY">
                    <input type="hidden" name="invoice_id" value="${paymentData.invoiceId}">
                    <input type="hidden" name="invoice_description" value="${paymentData.description}">
                    <input type="hidden" name="user_id" value="${paymentData.user_id}">
                    <input type="hidden" name="total" value="1">
                    <input type="hidden" name="installments_number" value="1">
                    <input type="hidden" name="cc_holder_name" value="${paymentData.cardHolder}">
                    <input type="hidden" name="cc_no" value="${paymentData.cardNumber}">
                    <input type="hidden" name="expiry_month" value="${paymentData.expMonth}">
                    <input type="hidden" name="expiry_year" value="${paymentData.expYear}">
                    <input type="hidden" name="cvv" value="${paymentData.cvc}">
                    <input type="hidden" name="name" value="${paymentData.cardHolder.split(' ')[0]}">
                    <input type="hidden" name="surname" value="${paymentData.cardHolder.split(' ').slice(1).join(' ')}">
                    <input type="hidden" name="bill_email" value="${paymentData.email}">
                    <input type="hidden" name="bill_phone" value="${paymentData.shippingAddress.phone}">
                    <input type="hidden" name="items" value='[{"id": "1", "quantity": 1, "price": 1, "name": "Test Product","description": "Test Product Description"}]'>
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
            console.error('3D Ödeme hatası:', error);
            throw error;
        }
    }

    async handle3DCallback(callbackData: any) {
        try {
            const {
                sipay_status,
                order_id,
                invoice_id,
                error_code,
                status_description,
                amount,
                credit_card_no
            } = callbackData;

            console.log("callbackData", callbackData);

            if (sipay_status === '1' && error_code === '100') {
                console.log("sipay_status", sipay_status);
                // Pending order'ı bul
                const pendingOrder = await this.pendingOrderModel.findOne({
                    invoiceId: invoice_id
                });

                if (!pendingOrder) {
                    throw new Error('Pending order not found');
                }

                // Kendi DB'mizde order oluştur
                const order = await this.orderModel.create({
                    userId: pendingOrder.userId,
                    orderNumber: order_id,
                    totalAmount: parseFloat(amount),
                    items: pendingOrder.items,
                    shippingAddress: pendingOrder.shippingAddress,
                    status: 'processing',
                    paymentId: order_id,
                    isPaid: true,
                    paidAt: new Date(),
                    shippingMethod: pendingOrder.shippingMethod
                });

                // İkas'ta order oluştur
                const ikasOrder = await this.ordersService.createOrder({
                    orderData: {
                        amount: parseFloat(amount)
                    },
                    items: {
                        items: pendingOrder.items
                    },
                    shippingAddress: pendingOrder.shippingAddress,
                    userId: pendingOrder.userId,
                    amount: parseFloat(amount),
                    shippingMethod: pendingOrder.shippingMethod
                });

                console.log("ikasOrder", ikasOrder);

                // Order'ı İkas ID ile güncelle
                await order.updateOne({
                    ikasOrderId: ikasOrder.id,
                    status: 'completed'
                });

                console.log("order", order);

                // Pending order'ı sil veya durumunu güncelle
                await pendingOrder.updateOne({ status: 'completed' });

                console.log("pendingOrder", pendingOrder);

                return {
                    success: true,
                    payment_id: order_id,
                    order_id: order.orderNumber,
                    ikas_order_id: ikasOrder.id,
                    invoice_id,
                    amount,
                    card_no: credit_card_no,
                    message: status_description
                };
            } else {
                // Ödeme başarısızsa pending order'ı sil veya failed olarak işaretle
                await this.pendingOrderModel.findOneAndUpdate(
                    { invoiceId: invoice_id },
                    { status: 'failed' }
                );
                throw new Error('Ödeme işlemi başarısız');
            }
        } catch (error) {
            console.error('3D Callback hatası:', error);
            throw error;
        }
    }
} 