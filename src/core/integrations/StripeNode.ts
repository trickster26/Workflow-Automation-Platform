import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';

// Define missing interfaces for now
interface IDataObject {
  [key: string]: any;
}

class NodeOperationError extends Error {
  constructor(node: any, message: string) {
    super(message);
    this.name = 'NodeOperationError';
  }
}
import Stripe from 'stripe';

export class StripeNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Stripe',
    name: 'stripe',
    icon: 'file:stripe.svg',
    group: ['integration'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interact with Stripe payment processing API',
    defaults: {
      name: 'Stripe',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'stripeApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Customer',
            value: 'customer',
          },
          {
            name: 'Payment Intent',
            value: 'paymentIntent',
          },
          {
            name: 'Payment Method',
            value: 'paymentMethod',
          },
          {
            name: 'Subscription',
            value: 'subscription',
          },
          {
            name: 'Invoice',
            value: 'invoice',
          },
          {
            name: 'Product',
            value: 'product',
          },
          {
            name: 'Price',
            value: 'price',
          },
          {
            name: 'Coupon',
            value: 'coupon',
          },
          {
            name: 'Webhook',
            value: 'webhook',
          },
          {
            name: 'Balance',
            value: 'balance',
          },
        ],
        default: 'customer',
      },

      // Customer Operations
      {
        displayName: 'Operation',
        name: 'customerOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['customer'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new customer',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a customer',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a customer',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a customer',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List customers',
          },
        ],
        default: 'create',
      },

      // Payment Intent Operations
      {
        displayName: 'Operation',
        name: 'paymentIntentOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['paymentIntent'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a payment intent',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a payment intent',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a payment intent',
          },
          {
            name: 'Confirm',
            value: 'confirm',
            description: 'Confirm a payment intent',
          },
          {
            name: 'Cancel',
            value: 'cancel',
            description: 'Cancel a payment intent',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List payment intents',
          },
        ],
        default: 'create',
      },

      // Payment Method Operations
      {
        displayName: 'Operation',
        name: 'paymentMethodOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['paymentMethod'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a payment method',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a payment method',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a payment method',
          },
          {
            name: 'Attach',
            value: 'attach',
            description: 'Attach payment method to customer',
          },
          {
            name: 'Detach',
            value: 'detach',
            description: 'Detach payment method from customer',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List payment methods',
          },
        ],
        default: 'create',
      },

      // Subscription Operations
      {
        displayName: 'Operation',
        name: 'subscriptionOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['subscription'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a subscription',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a subscription',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a subscription',
          },
          {
            name: 'Cancel',
            value: 'cancel',
            description: 'Cancel a subscription',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List subscriptions',
          },
        ],
        default: 'create',
      },

      // Invoice Operations
      {
        displayName: 'Operation',
        name: 'invoiceOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['invoice'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create an invoice',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get an invoice',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update an invoice',
          },
          {
            name: 'Pay',
            value: 'pay',
            description: 'Pay an invoice',
          },
          {
            name: 'Send',
            value: 'send',
            description: 'Send an invoice',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List invoices',
          },
        ],
        default: 'create',
      },

      // Product Operations
      {
        displayName: 'Operation',
        name: 'productOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['product'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a product',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a product',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a product',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a product',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List products',
          },
        ],
        default: 'create',
      },

      // Price Operations
      {
        displayName: 'Operation',
        name: 'priceOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['price'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a price',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a price',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a price',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List prices',
          },
        ],
        default: 'create',
      },

      // Balance Operations
      {
        displayName: 'Operation',
        name: 'balanceOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['balance'],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get account balance',
          },
        ],
        default: 'get',
      },

      // Resource ID
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['customer', 'paymentIntent', 'paymentMethod', 'subscription', 'invoice', 'product', 'price'],
          },
          hide: {
            customerOperation: ['create', 'list'],
            paymentIntentOperation: ['create', 'list'],
            paymentMethodOperation: ['create', 'list'],
            subscriptionOperation: ['create', 'list'],
            invoiceOperation: ['create', 'list'],
            productOperation: ['create', 'list'],
            priceOperation: ['create', 'list'],
          },
        },
        default: '',
        description: 'Resource ID',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          // Customer fields
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            description: 'Customer name',
          },
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            description: 'Customer email',
          },
          {
            displayName: 'Phone',
            name: 'phone',
            type: 'string',
            default: '',
            description: 'Customer phone number',
          },
          {
            displayName: 'Description',
            name: 'description',
            type: 'string',
            default: '',
            description: 'Description',
          },
          
          // Payment Intent fields
          {
            displayName: 'Amount',
            name: 'amount',
            type: 'number',
            default: 0,
            description: 'Amount in cents',
          },
          {
            displayName: 'Currency',
            name: 'currency',
            type: 'string',
            default: 'usd',
            description: 'Three-letter ISO currency code',
          },
          {
            displayName: 'Customer ID',
            name: 'customer',
            type: 'string',
            default: '',
            description: 'Customer ID',
          },
          {
            displayName: 'Payment Method',
            name: 'payment_method',
            type: 'string',
            default: '',
            description: 'Payment method ID',
          },
          {
            displayName: 'Confirm',
            name: 'confirm',
            type: 'boolean',
            default: false,
            description: 'Confirm payment intent immediately',
          },
          {
            displayName: 'Return URL',
            name: 'return_url',
            type: 'string',
            default: '',
            description: 'URL to redirect after payment',
          },
          
          // Payment Method fields
          {
            displayName: 'Type',
            name: 'type',
            type: 'options',
            options: [
              {
                name: 'Card',
                value: 'card',
              },
              {
                name: 'ACH Credit Transfer',
                value: 'ach_credit_transfer',
              },
              {
                name: 'ACH Debit',
                value: 'ach_debit',
              },
              {
                name: 'Alipay',
                value: 'alipay',
              },
            ],
            default: 'card',
            description: 'Payment method type',
          },
          
          // Subscription fields
          {
            displayName: 'Items',
            name: 'items',
            type: 'json',
            default: '[]',
            description: 'Subscription items (array of {price: "price_id"})',
          },
          
          // Product fields
          {
            displayName: 'Active',
            name: 'active',
            type: 'boolean',
            default: true,
            description: 'Whether product is active',
          },
          
          // Price fields
          {
            displayName: 'Product ID',
            name: 'product',
            type: 'string',
            default: '',
            description: 'Product ID for the price',
          },
          {
            displayName: 'Unit Amount',
            name: 'unit_amount',
            type: 'number',
            default: 0,
            description: 'Price amount in cents',
          },
          {
            displayName: 'Recurring',
            name: 'recurring',
            type: 'json',
            default: '{}',
            description: 'Recurring billing configuration',
          },
          
          // Common fields
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            description: 'Metadata key-value pairs',
          },
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            default: 10,
            description: 'Number of items to return (for list operations)',
          },
          {
            displayName: 'Starting After',
            name: 'starting_after',
            type: 'string',
            default: '',
            description: 'Cursor for pagination',
          },
        ],
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    let returnData: IDataObject[] = [];

    const credentials = await this.getCredentials('stripeApi');
    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    const stripe = new Stripe(credentials.secretKey as string, {
      apiVersion: '2023-10-16',
    });

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;

        let responseData: any;

        switch (resource) {
          case 'customer':
            responseData = await this.handleCustomerOperation(stripe, i);
            break;
          case 'paymentIntent':
            responseData = await this.handlePaymentIntentOperation(stripe, i);
            break;
          case 'paymentMethod':
            responseData = await this.handlePaymentMethodOperation(stripe, i);
            break;
          case 'subscription':
            responseData = await this.handleSubscriptionOperation(stripe, i);
            break;
          case 'invoice':
            responseData = await this.handleInvoiceOperation(stripe, i);
            break;
          case 'product':
            responseData = await this.handleProductOperation(stripe, i);
            break;
          case 'price':
            responseData = await this.handlePriceOperation(stripe, i);
            break;
          case 'balance':
            responseData = await this.handleBalanceOperation(stripe, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
        }

        if (Array.isArray(responseData?.data)) {
          returnData.push(...responseData.data);
        } else {
          returnData.push(responseData);
        }
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            error: error.message,
            json: {},
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }

  async handleCustomerOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('customerOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.customers.create({
          name: additionalFields.name as string,
          email: additionalFields.email as string,
          phone: additionalFields.phone as string,
          description: additionalFields.description as string,
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const customerId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.customers.retrieve(customerId);

      case 'update':
        const updateCustomerId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.customers.update(updateCustomerId, {
          name: additionalFields.name as string,
          email: additionalFields.email as string,
          phone: additionalFields.phone as string,
          description: additionalFields.description as string,
          metadata: additionalFields.metadata as any,
        });

      case 'delete':
        const deleteCustomerId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.customers.del(deleteCustomerId);

      case 'list':
        return await stripe.customers.list({
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The customer operation "${operation}" is not known!`);
    }
  }

  async handlePaymentIntentOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('paymentIntentOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.paymentIntents.create({
          amount: additionalFields.amount as number,
          currency: additionalFields.currency as string || 'usd',
          customer: additionalFields.customer as string,
          payment_method: additionalFields.payment_method as string,
          confirm: additionalFields.confirm as boolean,
          return_url: additionalFields.return_url as string,
          description: additionalFields.description as string,
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const paymentIntentId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentIntents.retrieve(paymentIntentId);

      case 'update':
        const updatePaymentIntentId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentIntents.update(updatePaymentIntentId, {
          amount: additionalFields.amount as number,
          currency: additionalFields.currency as string,
          customer: additionalFields.customer as string,
          payment_method: additionalFields.payment_method as string,
          description: additionalFields.description as string,
          metadata: additionalFields.metadata as any,
        });

      case 'confirm':
        const confirmPaymentIntentId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentIntents.confirm(confirmPaymentIntentId, {
          payment_method: additionalFields.payment_method as string,
          return_url: additionalFields.return_url as string,
        });

      case 'cancel':
        const cancelPaymentIntentId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentIntents.cancel(cancelPaymentIntentId);

      case 'list':
        return await stripe.paymentIntents.list({
          customer: additionalFields.customer as string,
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The payment intent operation "${operation}" is not known!`);
    }
  }

  async handlePaymentMethodOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('paymentMethodOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.paymentMethods.create({
          type: additionalFields.type as any || 'card',
        });

      case 'get':
        const paymentMethodId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentMethods.retrieve(paymentMethodId);

      case 'attach':
        const attachPaymentMethodId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentMethods.attach(attachPaymentMethodId, {
          customer: additionalFields.customer as string,
        });

      case 'detach':
        const detachPaymentMethodId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.paymentMethods.detach(detachPaymentMethodId);

      case 'list':
        return await stripe.paymentMethods.list({
          customer: additionalFields.customer as string,
          type: additionalFields.type as any,
          limit: additionalFields.limit as number || 10,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The payment method operation "${operation}" is not known!`);
    }
  }

  async handleSubscriptionOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('subscriptionOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.subscriptions.create({
          customer: additionalFields.customer as string,
          items: additionalFields.items as any || [],
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const subscriptionId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.subscriptions.retrieve(subscriptionId);

      case 'update':
        const updateSubscriptionId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.subscriptions.update(updateSubscriptionId, {
          items: additionalFields.items as any,
          metadata: additionalFields.metadata as any,
        });

      case 'cancel':
        const cancelSubscriptionId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.subscriptions.cancel(cancelSubscriptionId);

      case 'list':
        return await stripe.subscriptions.list({
          customer: additionalFields.customer as string,
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The subscription operation "${operation}" is not known!`);
    }
  }

  async handleInvoiceOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('invoiceOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.invoices.create({
          customer: additionalFields.customer as string,
          description: additionalFields.description as string,
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const invoiceId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.invoices.retrieve(invoiceId);

      case 'pay':
        const payInvoiceId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.invoices.pay(payInvoiceId);

      case 'send':
        const sendInvoiceId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.invoices.sendInvoice(sendInvoiceId);

      case 'list':
        return await stripe.invoices.list({
          customer: additionalFields.customer as string,
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The invoice operation "${operation}" is not known!`);
    }
  }

  async handleProductOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('productOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.products.create({
          name: additionalFields.name as string,
          description: additionalFields.description as string,
          active: additionalFields.active as boolean !== false,
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const productId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.products.retrieve(productId);

      case 'update':
        const updateProductId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.products.update(updateProductId, {
          name: additionalFields.name as string,
          description: additionalFields.description as string,
          active: additionalFields.active as boolean,
          metadata: additionalFields.metadata as any,
        });

      case 'delete':
        const deleteProductId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.products.del(deleteProductId);

      case 'list':
        return await stripe.products.list({
          active: additionalFields.active as boolean,
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The product operation "${operation}" is not known!`);
    }
  }

  async handlePriceOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('priceOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        return await stripe.prices.create({
          currency: additionalFields.currency as string || 'usd',
          product: additionalFields.product as string,
          unit_amount: additionalFields.unit_amount as number,
          recurring: additionalFields.recurring as any,
          metadata: additionalFields.metadata as any || {},
        });

      case 'get':
        const priceId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.prices.retrieve(priceId);

      case 'update':
        const updatePriceId = this.getNodeParameter('id', itemIndex) as string;
        return await stripe.prices.update(updatePriceId, {
          metadata: additionalFields.metadata as any,
          active: additionalFields.active as boolean,
        });

      case 'list':
        return await stripe.prices.list({
          product: additionalFields.product as string,
          active: additionalFields.active as boolean,
          limit: additionalFields.limit as number || 10,
          starting_after: additionalFields.starting_after as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The price operation "${operation}" is not known!`);
    }
  }

  async handleBalanceOperation(this: INodeExecuteFunctions, stripe: Stripe, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('balanceOperation', itemIndex) as string;

    switch (operation) {
      case 'get':
        return await stripe.balance.retrieve();

      default:
        throw new NodeOperationError(this.getNode(), `The balance operation "${operation}" is not known!`);
    }
  }
}