import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UuidService } from 'nestjs-uuid';
import { IkasService } from 'src/services/ikas.service';

@Injectable()
export class OrdersService {
    private readonly ikasApiUrl: string;

    constructor(
        private configService: ConfigService,
        private ikasService: IkasService,
        private readonly uuidService: UuidService
    ) {
        this.ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
    }

    async createOrder(orderData: any) {
        try {
            const accessToken = await this.ikasService.getAccessToken();
            console.log('Order Data:', orderData); // Gelen veriyi logla

            // Veri validasyonu
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Sipariş ürünleri geçersiz');
            }

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
                    disableAutoCreateCustomer: true,
                    order: {
                        id: this.uuidService.generate(),
                        orderLineItems: orderData.items.map((item: any) => ({
                            variant: {
                                id: item.id,
                            },
                            price: parseFloat(item.price),
                            quantity: parseInt(item.quantity)
                        })),
                        currencyCode: "TRY",
                        customer: {
                            id: "4e9ca10b-f57f-4e14-be43-d27bfb9631e6",
                            email: "mertcan@hikie.space",
                            firstName: "Mertcan",
                            lastName: "Karaman"
                        },
                        billingAddress: {
                            id: this.uuidService.generate(),
                            firstName: "Mertcan",
                            lastName: "Karaman",
                            addressLine1: "Emirhan caddesi ömer bey apt no:41 daire:9",
                            addressLine2: "Test Address 2",
                            phone: "+905384814035",
                            city: {
                                id: "dcb9135c-4b84-4c06-9a42-f359317a9b78",
                                name: "İstanbul"
                            },
                            country: {
                                id: "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
                                name: "Turkey"
                            },
                            isDefault: true
                        },
                        shippingAddress: {
                            id: this.uuidService.generate(),
                            firstName: "Mertcan",
                            lastName: "Karaman",
                            addressLine1: "Test Address",
                            phone: "5555555555",
                            city: {
                                name: "İstanbul"
                            },
                            country: {
                                code: 'TUR',
                                id: 'da8c5f2a-8d37-48a8-beff-6ab3793a1861',
                                name: 'Turkey'
                            },
                            isDefault: false
                        },
                        shippingMethod: "SHIPMENT",
                        shippingLines: [{
                            title: "Standart Kargo",
                            price: 0
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
            console.error('Sipariş oluşturma hatası:', error.response?.data || error);
            throw new Error('Sipariş oluşturulamadı: ' + (error.response?.data?.errors?.[0]?.message || error.message));
        }
    }

    async getUserOrders(email: string) {
        try {
            const accessToken = await this.ikasService.getAccessToken();

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
                                price
                                quantity
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
                            orderPackages {
                                orderPackageNumber
                                trackingInfo {
                                    cargoCompany
                                    trackingNumber
                                    trackingLink
                                }
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

            console.log('IKAS Orders Response:', JSON.stringify(response.data, null, 2));

            if (response.data.errors) {
                const error = response.data.errors[0];
                console.error('IKAS Error Details:', JSON.stringify(error.extensions, null, 2));
                throw new Error(`IKAS Error: ${error.message}`);
            }

            return response.data.data.listOrder.data;

        } catch (error) {
            console.error('Siparişler alınırken hata:', error.response?.data || error);
            throw new Error('Siparişler alınamadı: ' + (error.response?.data?.errors?.[0]?.message || error.message));
        }
    }

    
}
