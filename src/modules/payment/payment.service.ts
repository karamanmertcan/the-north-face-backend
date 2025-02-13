import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
    private readonly apiUrl: string;
    private readonly merchantKey: string;
    private readonly appKey: string;
    private readonly appSecret: string;

    constructor(private configService: ConfigService) {
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
        try {
            const hashKey = this.generateHashKey(
                paymentData.amount.toString(),
                '1', // taksit sayısı
                'TRY',
                paymentData.invoiceId
            );

            // HTML form oluştur
            const formHtml = `
                <form id="sipay_form" action="${this.apiUrl}/api/paySmart3D" method="POST">
                    <input type="hidden" name="merchant_key" value="${this.merchantKey}">
                    <input type="hidden" name="merchant_id" value="${this.configService.get('SIPAY_MERCHANT_ID')}">
                    <input type="hidden" name="currency_code" value="TRY">
                    <input type="hidden" name="invoice_id" value="${paymentData.invoiceId}">
                    <input type="hidden" name="invoice_description" value="${paymentData.description}">
                    <input type="hidden" name="total" value="${paymentData.amount}">
                    <input type="hidden" name="installments_number" value="1">
                    <input type="hidden" name="card_number" value="${paymentData.cardNumber}">
                    <input type="hidden" name="card_holder" value="${paymentData.cardHolder}">
                    <input type="hidden" name="expiry_month" value="${paymentData.expMonth}">
                    <input type="hidden" name="expiry_year" value="${paymentData.expYear}">
                    <input type="hidden" name="cvv" value="${paymentData.cvc}">
                    <input type="hidden" name="name" value="${paymentData.cardHolder}">
                    <input type="hidden" name="return_url" value="${this.configService.get('APP_URL')}/payment/callback">
                    <input type="hidden" name="cancel_url" value="${this.configService.get('APP_URL')}/payment/cancel">
                    <input type="hidden" name="hash_key" value="${hashKey}">
                </form>
                <script>
                    document.getElementById('sipay_form').submit();
                </script>
            `;

            return { html_content: formHtml };
        } catch (error) {
            console.error('3D Ödeme hatası:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || '3D Ödeme işlemi başarısız');
        }
    }

    async handle3DCallback(callbackData: any) {
        try {
            // 3D doğrulama sonrası gelen verileri işle
            const {
                status,
                payment_id,
                order_id,
                merchant_key,
                invoice_id,
                error_code,
                error_message
            } = callbackData;

            if (status === 'SUCCESS') {
                // Ödeme başarılı - veritabanında güncelleme yapılabilir
                return {
                    success: true,
                    payment_id,
                    order_id,
                    invoice_id
                };
            } else {
                // Ödeme başarısız
                throw new Error(error_message || 'Ödeme işlemi başarısız');
            }
        } catch (error) {
            console.error('3D Callback hatası:', error);
            throw error;
        }
    }
} 