import { Controller, Post, Body, UseGuards, Get, Query, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create-3d')
    async create3DPayment(@Body() paymentData: any) {
        return this.paymentService.create3DPayment(paymentData);
    }

    @Post('callback')
    async handle3DCallback(@Body() callbackData: any, @Res() res: Response) {
        try {
            console.log("Callback data received:", callbackData);
            const result = await this.paymentService.handle3DCallback(callbackData);

            console.log("result", result);

            // Başarılı ödeme sayfası HTML'i
            const successHtml = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                margin: 0;
                                background-color: #f5f5f5;
                                flex-direction: column;
                                padding: 20px;
                            }
                            .success-icon {
                                width: 64px;
                                height: 64px;
                                margin-bottom: 20px;
                            }
                            .message {
                                font-size: 24px;
                                color: #4CAF50;
                                margin-bottom: 10px;
                                text-align: center;
                            }
                            .details {
                                font-size: 16px;
                                color: #666;
                                margin-bottom: 20px;
                                text-align: center;
                            }
                            .order-id {
                                font-size: 14px;
                                color: #999;
                                text-align: center;
                            }
                        </style>
                    </head>
                    <body>
                        <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4CAF50" stroke-width="2"/>
                            <path d="M8 12L11 15L16 9" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="message">Ödeme Başarılı!</div>
                        <div class="details">Ödemeniz başarıyla tamamlandı.</div>
                        <div class="order-id">Sipariş No: ${result.order_id}</div>
                        <script>
                            // 2 saniye sonra uygulamaya geri dön
                            setTimeout(() => {
                                window.ReactNativeWebView?.postMessage(JSON.stringify({
                                    status: 'SUCCESS',
                                    orderId: '${result.order_id}',
                                    paymentId: '${result.payment_id}'
                                }));
                            }, 2000);
                        </script>
                    </body>
                </html>
            `;

            res.send(successHtml);
        } catch (error) {
            console.error("Callback error:", error);
            // Hata sayfası HTML'i
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                margin: 0;
                                background-color: #f5f5f5;
                                flex-direction: column;
                                padding: 20px;
                            }
                            .error-icon {
                                width: 64px;
                                height: 64px;
                                margin-bottom: 20px;
                            }
                            .message {
                                font-size: 24px;
                                color: #f44336;
                                margin-bottom: 10px;
                                text-align: center;
                            }
                            .details {
                                font-size: 16px;
                                color: #666;
                                margin-bottom: 20px;
                                text-align: center;
                            }
                        </style>
                    </head>
                    <body>
                        <svg class="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#f44336" stroke-width="2"/>
                            <path d="M15 9L9 15" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>
                            <path d="M9 9L15 15" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <div class="message">Ödeme Başarısız</div>
                        <div class="details">${error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</div>
                        <script>
                            // 2 saniye sonra uygulamaya geri dön
                            setTimeout(() => {
                                window.ReactNativeWebView?.postMessage(JSON.stringify({
                                    status: 'ERROR',
                                    error: '${error.message || 'Ödeme işlemi başarısız'}'
                                }));
                            }, 2000);
                        </script>
                    </body>
                </html>
            `;

            res.send(errorHtml);
        }
    }

    @Post('cancel')
    async handleCancel(@Body() cancelData: any, @Res() res: Response) {
        console.log("Cancel data received:", cancelData);
        const cancelHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background-color: #f5f5f5;
                            flex-direction: column;
                            padding: 20px;
                        }
                        .cancel-icon {
                            width: 64px;
                            height: 64px;
                            margin-bottom: 20px;
                        }
                        .message {
                            font-size: 24px;
                            color: #ff9800;
                            margin-bottom: 10px;
                            text-align: center;
                        }
                        .details {
                            font-size: 16px;
                            color: #666;
                            margin-bottom: 20px;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <svg class="cancel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ff9800" stroke-width="2"/>
                        <path d="M8 12H16" stroke="#ff9800" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div class="message">Ödeme İptal Edildi</div>
                    <div class="details">Ödeme işlemi iptal edildi.</div>
                    <script>
                        // 2 saniye sonra uygulamaya geri dön
                        setTimeout(() => {
                            window.ReactNativeWebView?.postMessage(JSON.stringify({
                                status: 'CANCELLED'
                            }));
                        }, 2000);
                    </script>
                </body>
            </html>
        `;

        res.send(cancelHtml);
    }
} 