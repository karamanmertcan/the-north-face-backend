import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { UuidService } from 'nestjs-uuid';
import { Order, OrderDocument } from 'src/schemas/order.schema';
import { IkasService } from 'src/services/ikas.service';
import * as crypto from 'crypto';


import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class OrdersService {
    private readonly ikasApiUrl: string;
    private readonly apiUrl: string;
    private readonly appId: string;
    private readonly appKey: string;
    private readonly appSecret: string;
    private readonly merchantKey: string;

    constructor(
        private configService: ConfigService,
        private ikasService: IkasService,
        private readonly uuidService: UuidService,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) {
        this.ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
        this.apiUrl = this.configService.get('SIPAY_API_URL');
        this.appId = this.configService.get('SIPAY_MERCHANT_ID');
        this.appKey = this.configService.get('SIPAY_APP_KEY');
        this.appSecret = this.configService.get('SIPAY_APP_SECRET');
        this.merchantKey = this.configService.get('SIPAY_MERCHANT_KEY');
    }

    private generateHashKey(total: string, installment: string, currency_code: string, invoice_id: string) {
        try {
            const data = `${total}|${installment}|${currency_code}|${this.merchantKey}|${invoice_id}`;

            console.log('Data:', data);

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

    async createOrder({ orderData, items, shippingAddress, userId, amount, shippingMethod, email }: { orderData: any, items: any, shippingAddress: any, userId: any, amount: number, shippingMethod: any, email: string }) {
        try {
            const accessToken = await this.ikasService.getAccessToken();
            console.log('Order Data:', orderData);
            console.log('Items type:', typeof items);
            console.log('Items:', items);

            // items'ı array'e çevir eğer değilse
            const orderItems = items.items || items;

            console.log('Order Items:', orderItems);

            const mutation = `
                mutation CreateOrderWithTransactions($input: CreateOrderWithTransactionsInput!) {
                    createOrderWithTransactions(input: $input) {
                        id
                        orderNumber
                        status
                        totalPrice
                        totalFinalPrice
                        currencyCode
                        orderLineItems {
                            id
                            variant {
                                id
                                name
                            }
                            price
                            quantity
                        }
                        billingAddress {
                            firstName
                            lastName
                            addressLine1
                            phone
                            city {
                                name
                            }
                            country {
                                name
                            }
                        }
                        shippingAddress {
                            firstName
                            lastName
                            addressLine1
                            phone
                            city {
                                name
                            }
                            country {
                                name
                            }
                        }
                        customer {
                            email
                            firstName
                            lastName
                        }
                        shippingMethod
                        orderedAt
                        paymentMethods {
                            paymentGatewayId
                            paymentGatewayName
                            paymentGatewayCode
                            price
                        }
                    }
                }
            `;

            const variables = {
                input: {
                    order: {
                        id: this.uuidService.generate(),
                        orderLineItems: orderItems.map((item: any) => ({
                            variant: {
                                // id: "e3402ae7-7a76-4e8a-8b32-4b1d5ca2b497",
                                //selec
                                id: item.selectedVariants[0].parentId,
                                // name: item.selectedVariants.map(v => v.valueName).join(' / ')
                            },
                            price: parseFloat(item.price),
                            quantity: item.quantity
                        })),
                        customer: {
                            firstName: shippingAddress.firstName,
                            lastName: shippingAddress.lastName,
                            email: email
                        },
                        billingAddress: {
                            firstName: shippingAddress.firstName,
                            lastName: shippingAddress.lastName,
                            phone: shippingAddress.phone,
                            addressLine1: shippingAddress.addressLine1,
                            city: {
                                id: shippingAddress.city.id,
                                name: shippingAddress.city.name
                            },
                            country: {
                                id: shippingAddress.country.id,
                                name: shippingAddress.country.name
                            },
                            isDefault: true
                        },
                        shippingAddress: {
                            id: this.uuidService.generate(),
                            firstName: shippingAddress.firstName,
                            lastName: shippingAddress.lastName,
                            phone: shippingAddress.phone,
                            addressLine1: shippingAddress.addressLine1,
                            city: {
                                id: shippingAddress.city.id,
                                name: shippingAddress.city.name
                            },
                            country: {
                                id: shippingAddress.country.id,
                                name: shippingAddress.country.name
                            },
                            isDefault: false
                        },
                        shippingMethod: "SHIPMENT",
                        shippingLines: [{
                            title: shippingMethod.name,
                            price: shippingMethod.price
                        }]
                    },
                    transactions: [{
                        amount: parseFloat(orderData.amount),
                        paymentGatewayId: "sipay"
                    }]
                }
            };

            console.log('IKAS Order Request:', JSON.stringify(variables, null, 2));

            const response = await axios.post(this.ikasApiUrl, {
                query: mutation,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            console.log('IKAS Order Response:', JSON.stringify(response.data, null, 2));


            if (response.data.errors) {
                const error = response.data.errors[0];
                console.error('IKAS Error Details:', JSON.stringify(error.extensions, null, 2));
                throw new Error(`IKAS Error: ${error.message} - ${JSON.stringify(error.extensions)}`);
            }

            return response.data.data.createOrderWithTransactions;
        } catch (error) {
            console.error('Sipariş oluşturma hatası:', error);
            throw error;
        }
    }

    async getUserOrders(email: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

            // Önce kullanıcıyı bul
            const user = await this.userModel.findOne({ email });
            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            // IKAS'tan siparişleri al
            const query = `
                query ListOrder($customerEmail: StringFilterInput) {
                    listOrder(customerEmail: $customerEmail) {
                        data {
                            id
                            orderNumber
                            status
                            totalPrice
                            totalFinalPrice
                            currencyCode
                            orderedAt
                            orderLineItems {
                                id
                                quantity
                                price
                                finalPrice
                                variant {
                                    id
                                    name
                                    mainImageId
                                    brand {
                                        name
                                    }
                                }
                            }
                            billingAddress {
                                firstName
                                lastName
                                addressLine1
                                phone
                                city {
                                    name
                                }
                                country {
                                    name
                                }
                            }
                            shippingAddress {
                                firstName
                                lastName
                                addressLine1
                                phone
                                city {
                                    name
                                }
                                country {
                                    name
                                }
                            }
                            customer {
                                email
                                firstName
                                lastName
                            }
                            shippingMethod
                            paymentMethods {
                                price
                                type
                            }
                        }
                    }
                }
            `;

            const variables = {
                customerEmail: {
                    eq: email
                }
            };

            const response = await axios.post(this.ikasApiUrl, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            const ikasOrders = response.data.data.listOrder.data;

            // DB'deki siparişleri kontrol et
            const dbOrders = await this.orderModel.find({
                userId: user._id
            });

            // IKAS siparişlerini DB ile senkronize et
            for (const ikasOrder of ikasOrders) {
                const existingOrder = dbOrders.find(
                    dbOrder => dbOrder.ikasOrderId === ikasOrder.id
                );

                if (!existingOrder) {
                    // Yeni siparişi DB'ye ekle
                    const orderData = {
                        ikasOrderId: ikasOrder.id,
                        ikasOrderNumber: ikasOrder.orderNumber, // IKAS order number'ı ayrı saklıyoruz
                        status: ikasOrder.status,
                        items: ikasOrder.orderLineItems,
                        shippingAddress: ikasOrder.shippingAddress,
                        customer: ikasOrder.customer,
                        totalAmount: ikasOrder.totalFinalPrice,
                        shippingMethod: ikasOrder.shippingMethod,
                        createdAt: new Date(parseInt(ikasOrder.orderedAt)),
                        userId: user._id,
                        orderNumber: `HS-${this.uuidService.generate()}`,
                    };

                    await this.orderModel.create(orderData);
                }
            }

            // Güncel IKAS siparişlerini dön
            return ikasOrders;

        } catch (error) {
            console.error('Siparişler alınırken hata:', error);
            throw new Error('Siparişler alınamadı: ' + error.message);
        }
    }


    async getOrderById(orderId: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();


            // const order = await this.orderModel.findOne({
            //     ikasOrderId: orderId
            // });

            // if (!order) {
            //     throw new Error('Sipariş bulunamadı');
            // }

            // console.log('Order:', order);




            const query = `
                query ListOrder($listOrderId: StringFilterInput) {
                    listOrder(id: $listOrderId) {
                        data {
                            id
                            orderNumber
                            status
                            totalPrice
                            totalFinalPrice
                            currencyCode
                            orderedAt
                            orderLineItems {
                                id
                                quantity
                                price
                                finalPrice
                                variant {
                                    id
                                    name
                                    mainImageId
                                    brand {
                                        name
                                    }
                                    variantValues {
                                        variantValueName
                                        variantTypeName
                                    }
                                }
                            }
                            billingAddress {
                                firstName
                                lastName
                                addressLine1
                                phone
                                postalCode
                                city {
                                    name
                                }
                                district {
                                    name
                                }
                                country {
                                    name
                                }
                            }
                            shippingAddress {
                                firstName
                                lastName
                                addressLine1
                                phone
                                postalCode
                                city {
                                    name
                                }
                                district {
                                    name
                                }
                                country {
                                    name
                                }
                            }
                            customer {
                                email
                                firstName
                                lastName
                                phone
                            }
                            shippingMethod
                            stockLocationId
                            paymentMethods {
                                price
                                type
                            }
                            orderPackages {
                                orderPackageNumber
                                orderPackageFulfillStatus
                                createdAt
                            }
                        }
                    }
                }
            `;

            const variables = {
                listOrderId: {
                    eq: orderId
                }
            };

            const response = await axios.post(this.ikasApiUrl, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            console.log('IKAS Order Response:', JSON.stringify(response.data, null, 2));

            if (response.data.errors) {
                const error = response.data.errors[0];
                throw new Error(`IKAS Error: ${error.message}`);
            }

            // İlk siparişi döndür çünkü ID'ye göre arama yapıyoruz
            return response.data.data.listOrder.data[0];
        } catch (error) {
            console.error('Sipariş alınırken hata:', error.response?.data || error);
            throw new Error('Sipariş alınamadı: ' + (error.response?.data?.errors?.[0]?.message || error.message));
        }
    }

    async getToken(): Promise<{ token: string, appId: string }> {
        try {
            const response = await axios.post(`${this.apiUrl}/api/token`, {
                app_id: this.appKey,
                app_secret: this.appSecret
            });

            console.log('Token Response:', response.data);

            return {
                token: response.data.data.token,
                appId: response.data.data.app_id,
            };
        } catch (error) {
            throw new Error('Token alınamadı');
        }
    }

    async refundOrder(orderId: string, orderLineItemId: string, quantity: number, price: number, stockLocationId: string) {
        try {
            console.log('Order ID:', orderId);
            console.log('Order Line Item ID:', orderLineItemId);
            console.log('Quantity:', quantity);
            console.log('Price:', price);
            console.log('Stock Location ID:', stockLocationId);

            const order = await this.orderModel.findOne({
                ikasOrderId: orderId
            });

            console.log('Order:', order);

            if (!order) {
                throw new Error('Sipariş bulunamadı');
            }

            const getTokenAppId = await this.getToken();
            console.log('Token:', getTokenAppId);

            const data = {
                invoice_id: order.invoiceId,
                amount: "",
                app_id: this.appKey,
                app_secret: this.appSecret,
                merchant_key: this.merchantKey,
                hash_key: this.generateHashKey(
                    "349",
                    "1",
                    "TRY",
                    order.invoiceId
                ),
                refund_transaction_id: "",
                refund_web_hook_key: "string"
            }

            console.log('Data:', data);



            // Önce Sipay Refund
            const sipayResponse = await axios.post(this.apiUrl + '/api/refund', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await this.getToken()).token}`
                }
            });

            console.log('Sipay Response:', sipayResponse.data);

            // Sipay başarılı ise IKAS Refund
            if (sipayResponse.data.status_code === 100) {
                const accessToken = await this.ikasService.getAccessToken();

                const mutation = `
                    mutation RefundOrderLine($input: OrderRefundInput!) {
                        refundOrderLine(input: $input) {
                            id
                            invoices {
                                id
                                appName
                                appId
                                invoiceData
                                invoiceNumber
                            }
                            orderLineItems {
                                id
                                finalPrice
                            }
                        }
                    }
                `;

                const variables = {
                    input: {
                        orderId,
                        orderRefundLines: [
                            {
                                orderLineItemId,
                                quantity,
                                price,
                                restockItems: true
                            }
                        ],
                        stockLocationId: stockLocationId ? stockLocationId : null
                    }
                };

                const ikasResponse = await axios.post(this.ikasApiUrl, {
                    query: mutation,
                    variables
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                if (ikasResponse.data.errors) {
                    throw new Error(`IKAS Error: ${ikasResponse.data.errors[0].message}`);
                }

                // DB'deki siparişi güncelle
                await this.orderModel.findOneAndUpdate(
                    { ikasOrderId: orderId },
                    {
                        $set: {
                            status: 'REFUNDED',
                            refundInfo: {
                                refundedAt: new Date(),
                                refundAmount: price,
                                refundOrderNo: sipayResponse.data.order_no,
                                refundInvoiceId: sipayResponse.data.invoice_id,
                                refundRefNo: sipayResponse.data.ref_no
                            }
                        }
                    }
                );

                return {
                    ...ikasResponse.data.data.refundOrderLine,
                    refundStatus: 'success',
                    sipayRefundInfo: sipayResponse.data
                };
            } else {
                throw new Error('Sipay refund failed: ' + sipayResponse.data.status_description);
            }

        } catch (error) {
            console.error('Sipariş iadesi yapılırken hata:', error.response?.data || error);
            throw new Error('Sipariş iadesi yapılamadı: ' + (error.response?.data?.errors?.[0]?.message || error.message));
        }
    }
}
