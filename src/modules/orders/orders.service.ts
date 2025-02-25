import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { UuidService } from 'nestjs-uuid';
import { Order, OrderDocument } from 'src/schemas/order.schema';
import { IkasService } from 'src/services/ikas.service';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.ikasApiUrl = 'https://api.myikas.com/api/v1/admin/graphql';
    this.apiUrl = this.configService.get('SIPAY_API_URL');
    this.appId = this.configService.get('SIPAY_MERCHANT_ID');
    this.appKey = this.configService.get('SIPAY_APP_KEY');
    this.appSecret = this.configService.get('SIPAY_APP_SECRET');
    this.merchantKey = this.configService.get('SIPAY_MERCHANT_KEY');
  }

  private generateHashKey(
    total: string,
    installment: string,
    currency_code: string,
    invoice_id: string,
  ) {
    try {
      const data = `${total}|${installment}|${currency_code}|${this.merchantKey}|${invoice_id}`;

      const iv = crypto
        .createHash('sha1')
        .update(String(Math.random()))
        .digest('hex')
        .slice(0, 16);

      const password = crypto
        .createHash('sha1')
        .update(this.appSecret)
        .digest('hex');

      const salt = crypto
        .createHash('sha1')
        .update(String(Math.random()))
        .digest('hex')
        .slice(0, 4);

      const salt_with_password = crypto
        .createHash('sha256')
        .update(password + salt)
        .digest('hex')
        .slice(0, 32);

      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        salt_with_password,
        iv,
      );
      let encrypted = cipher.update(data, 'binary', 'base64');
      encrypted += cipher.final('base64');

      const msg_encrypted_bundle = `${iv}:${salt}:${encrypted}`;
      return msg_encrypted_bundle.replace('/', '__');
    } catch (error) {
      console.error('Hash key oluşturma hatası:', error);
      return null;
    }
  }

  async createOrder({
    orderData,
    items,
    shippingAddress,
    userId,
    amount,
    shippingMethod,
    email,
  }: {
    orderData: any;
    items: any;
    shippingAddress: any;
    userId: any;
    amount: number;
    shippingMethod: any;
    email: string;
  }) {
    try {
      const accessToken = await this.ikasService.getAccessToken();
      console.log('Order Data:', orderData);
      console.log('Items type:', typeof items);
      console.log('Items:', items);

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
                id: item.selectedVariants[0]?.parentId,
              },
              price: parseFloat(item.price),
              quantity: item.quantity,
            })),
            customer: {
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              email: email,
            },
            billingAddress: {
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              phone: shippingAddress.phone,
              addressLine1: shippingAddress.addressLine1,
              city: {
                id: shippingAddress.city.id,
                name: shippingAddress.city.name,
              },
              country: {
                id: shippingAddress.country.id,
                name: shippingAddress.country.name,
              },
              isDefault: true,
            },
            shippingAddress: {
              id: this.uuidService.generate(),
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              phone: shippingAddress.phone,
              addressLine1: shippingAddress.addressLine1,
              city: {
                id: shippingAddress.city.id,
                name: shippingAddress.city.name,
              },
              country: {
                id: shippingAddress.country.id,
                name: shippingAddress.country.name,
              },
              isDefault: false,
            },
            shippingMethod: 'SHIPMENT',
            shippingLines: [
              {
                title: shippingMethod.name,
                price: shippingMethod.price,
              },
            ],
          },
          transactions: [
            {
              amount: parseFloat(orderData.amount),
              paymentGatewayId: 'sipay',
            },
          ],
        },
      };

      console.log('IKAS Order Request:', JSON.stringify(variables, null, 2));

      const response = await axios.post(
        this.ikasApiUrl,
        {
          query: mutation,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log(
        'IKAS Order Response:',
        JSON.stringify(response.data, null, 2),
      );

      if (response.data.errors) {
        const error = response.data.errors[0];
        console.error(
          'IKAS Error Details:',
          JSON.stringify(error.extensions, null, 2),
        );
        throw new Error(
          `IKAS Error: ${error.message} - ${JSON.stringify(error.extensions)}`,
        );
      }

      return response.data.data.createOrderWithTransactions;
    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      throw error;
    }
  }

  async getUserOrders(email: string) {
    console.log('getUserOrders', email);
    try {
      const orders = await this.orderModel.find({
        'customer.email': email,
      });
      console.log('orders', orders);
      return orders;
    } catch (error) {
      console.error('Sipariş listeleme hatası:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string) {
    console.log('orderId', orderId);
    try {
      const getUserOrders = await this.orderModel.findOne({
        ikasOrderId: orderId,
      });

      console.log('user orders ===>', getUserOrders);

      return getUserOrders;
    } catch (error) {
      console.error('Sipariş alınırken hata:', error.response?.data || error);
      throw new Error(
        'Sipariş alınamadı: ' +
          (error.response?.data?.errors?.[0]?.message || error.message),
      );
    }
  }

  async getToken(): Promise<{ token: string; appId: string }> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/token`, {
        app_id: this.appKey,
        app_secret: this.appSecret,
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

  async refundOrder(
    orderId: string,
    orderLineItemId: string,
    quantity: number,
    price: number,
    stockLocationId: string,
  ) {
    try {
      console.log('Order ID:', orderId);
      console.log('Order Line Item ID:', orderLineItemId);
      console.log('Quantity:', quantity);
      console.log('Price:', price);
      console.log('Stock Location ID:', stockLocationId);

      const order = await this.orderModel.findOne({
        ikasOrderId: orderId,
      });

      console.log('Order:', order);

      if (!order) {
        throw new Error('Sipariş bulunamadı');
      }

      const getTokenAppId = await this.getToken();

      const hashKey = this.generateHashKey('1.00', '1', 'TRY', order.invoiceId);

      const data = {
        invoice_id: order.invoiceId,
        amount: '1',
        merchant_key: this.merchantKey,
      };

      console.log('Data:', data);

      const sipayResponse = await axios.post(
        'https://app.sipay.com.tr/ccpayment' + '/api/refund',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await this.getToken()).token}`,
          },
        },
      );

      console.log('Sipay Response:', sipayResponse.data);

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
                restockItems: true,
              },
            ],
            stockLocationId: stockLocationId ? stockLocationId : null,
          },
        };

        const ikasResponse = await axios.post(
          this.ikasApiUrl,
          {
            query: mutation,
            variables,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (ikasResponse.data.errors) {
          throw new Error(`IKAS Error: ${ikasResponse.data.errors[0].message}`);
        }

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
                refundRefNo: sipayResponse.data.ref_no,
              },
            },
          },
        );

        return {
          ...ikasResponse.data.data.refundOrderLine,
          refundStatus: 'success',
          sipayRefundInfo: sipayResponse.data,
        };
      } else {
        throw new Error(
          'Sipay refund failed: ' + sipayResponse.data.status_description,
        );
      }
    } catch (error) {
      console.error(
        'Sipariş iadesi yapılırken hata:',
        error.response?.data || error,
      );
      throw new Error(
        'Sipariş iadesi yapılamadı: ' +
          (error.response?.data?.errors?.[0]?.message || error.message),
      );
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncOrders() {
    try {
      console.log('Starting order sync...');
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const response = await this.ikasService.makeRequest(
          `query {
                        listOrder(
                            pagination: {
                                page: ${page}
                            }
                        ) {
                            data {
                                id
                                orderNumber
                                status
                                orderPaymentStatus
                                totalPrice
                                totalFinalPrice
                                netTotalFinalPrice
                                createdAt
                                orderedAt
                                cancelledAt
                                cancelReason
                                note
                                customer {
                                    id
                                    email
                                    firstName
                                    lastName
                                    fullName
                                    phone
                                    preferredLanguage
                                    isGuestCheckout
                                }
                                billingAddress {
                                    firstName
                                    lastName
                                    phone
                                    addressLine1
                                    addressLine2
                                    city {
                                        id
                                        name
                                        code
                                    }
                                    district {
                                        id
                                        name
                                        code
                                    }
                                    state {
                                        id
                                        name
                                        code
                                    }
                                    country {
                                        id
                                        name
                                        code
                                        iso2
                                        iso3
                                    }
                                    postalCode
                                    company
                                    taxNumber
                                    taxOffice
                                    identityNumber
                                }
                                shippingAddress {
                                    firstName
                                    lastName
                                    phone
                                    addressLine1
                                    addressLine2
                                    city {
                                        id
                                        name
                                        code
                                    }
                                    district {
                                        id
                                        name
                                        code
                                    }
                                    state {
                                        id
                                        name
                                        code
                                    }
                                    country {
                                        id
                                        name
                                        code
                                        iso2
                                        iso3
                                    }
                                    postalCode
                                    company
                                    taxNumber
                                    taxOffice
                                    identityNumber
                                }
                                orderLineItems {
                                    id
                                    quantity
                                    price
                                    finalPrice
                                    unitPrice
                                    finalUnitPrice
                                    discountPrice
                                    status
                                    variant {
                                        id
                                        sku
                                        name
                                        mainImageId
                                        productId
                                        brand {
                                            id
                                            name
                                        }
                                    }
                                }
                                orderPackages {
                                    id
                                    orderPackageNumber
                                    orderPackageFulfillStatus
                                    trackingInfo {
                                        cargoCompany
                                        trackingNumber
                                        trackingLink
                                    }
                                }
                                shippingLines {
                                    title
                                    price
                                    finalPrice
                                    taxValue
                                }
                            }
                            hasNext
                            page
                            limit
                            count
                        }
                    }`,
        );

        const orders = response?.data?.data?.listOrder?.data || [];
        hasNext = response?.data?.data?.listOrder?.hasNext;

        // Update or create orders in database
        for (const order of orders) {
          try {
            // Find the user by IKAS ID
            const user = await this.userModel.findOne({
              ikasUserId: order.customer?.id,
            });
            console.log(
              'orderlineitems',
              order.orderLineItems?.map((item) => ({
                productId: item?.variant?.productId,
                variantId: item?.variant?.id,
                quantity: item?.quantity,
                price: item?.finalPrice,
                mainImageId: item?.variant?.mainImageId,
                name: item?.variant?.name,
                brand: item?.variant?.brand
                  ? {
                      id: item?.variant?.brand?.id,
                      name: item?.variant?.brand?.name,
                    }
                  : null,
                selectedVariants:
                  item?.variant?.variantValues?.map((variant) => ({
                    valueId: variant?.variantValueId,
                    valueName: variant?.variantValueName,
                  })) || [],
              })),
            );
            await this.orderModel.findOneAndUpdate(
              { ikasOrderId: order.id },
              {
                ikasOrderId: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                isPaid: order.orderPaymentStatus === 'PAID',
                paidAt: order.orderedAt,
                totalAmount: order.totalFinalPrice,
                createdAt: order.createdAt,
                updatedAt: new Date(),
                userId: user?._id, // Optional: might be null if user not found
                customer: order.customer
                  ? {
                      ikasCustomerId: order.customer.id,
                      email: order.customer.email,
                      firstName: order.customer.firstName,
                      lastName: order.customer.lastName,
                      fullName: order.customer.fullName,
                      phone: order.customer.phone,
                      isGuestCheckout: order.customer.isGuestCheckout,
                    }
                  : null,
                items:
                  order.orderLineItems?.map((item) => ({
                    productId: item?.variant?.productId,
                    variantId: item?.variant?.id,
                    quantity: item?.quantity,
                    price: item?.finalPrice,
                    mainImageId: item?.variant?.mainImageId,
                    name: item?.variant?.name,
                    brand: item?.variant?.brand
                      ? {
                          id: item?.variant?.brand?.id,
                          name: item?.variant?.brand?.name,
                        }
                      : null,
                    selectedVariants:
                      item?.variant?.variantValues?.map((variant) => ({
                        valueId: variant?.variantValueId,
                        valueName: variant?.variantValueName,
                      })) || [],
                  })) || [],
                shippingAddress: order.shippingAddress
                  ? {
                      firstName: order.shippingAddress?.firstName,
                      lastName: order.shippingAddress?.lastName,
                      phone: order.shippingAddress?.phone,
                      addressLine1: order.shippingAddress?.addressLine1,
                      apartment: order.shippingAddress?.addressLine2,
                      postalCode: order.shippingAddress?.postalCode,
                      country: order.shippingAddress?.country
                        ? {
                            id: order.shippingAddress?.country?.id,
                            name: order.shippingAddress?.country?.name,
                          }
                        : null,
                      city: order.shippingAddress?.city
                        ? {
                            id: order.shippingAddress?.city?.id,
                            name: order.shippingAddress?.city?.name,
                          }
                        : null,
                      district: order.shippingAddress?.district
                        ? {
                            id: order.shippingAddress?.district?.id,
                            name: order.shippingAddress?.district?.name,
                          }
                        : null,
                    }
                  : null,
                shippingMethod: {
                  type:
                    order.shippingLines?.[0]?.title?.toLowerCase() || 'free',
                  name: order.shippingLines?.[0]?.title || 'Standart Kargo',
                  price: order.shippingLines?.[0]?.finalPrice || 0,
                },
              },
              { upsert: true, new: true },
            );
          } catch (error) {
            console.error('Error processing order:', error);
          }
        }

        console.log(`Processed ${orders.length} orders from page ${page}`);
        page++;

        // Rate limiting - her sayfa arasında 1 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('Order sync completed successfully');
    } catch (error) {
      console.error('Error syncing orders:', error);
    }
  }
}
