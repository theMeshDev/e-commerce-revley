import { Injectable, Logger } from '@nestjs/common';
import { SupabaseAdminService } from '../auth/services/supabase-admin.service';
import { EventBridgeService } from '../eventbridge/eventbridge.service';
import { NmiService } from '../nmi/nmi.service';
import { StripeService } from '../stripe/stripe.service';
import { CheckoutDto, CheckoutResponseDto } from './checkout.dto';

// Hard-coded store ID and product for this challenge
const STORE_ID = '00000000-0000-0000-0000-000000000001';
const PRODUCT_AMOUNT = 34.99;
const SUBSCRIPTION_FREQUENCY_DAYS = 30;

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly supabase: SupabaseAdminService,
    private readonly stripe: StripeService,
    private readonly nmi: NmiService,
    private readonly eventBridge: EventBridgeService,
  ) {}

  async processCheckout(dto: CheckoutDto): Promise<CheckoutResponseDto> {
    this.logger.log(`Processing checkout for ${dto.email}`);

    // 1. Get or create customer
    const customer = await this.getOrCreateCustomer(dto);

    // 2. Determine which processor to use based on store configuration
    const processor = await this.selectProcessor(STORE_ID);
    this.logger.log(`Selected processor: ${processor}`);

    // 3. Create payment method and process payment
    const { paymentMethodId, processorTransactionId } =
      await this.processPayment(dto, customer.id, processor);

    // 4. Create transaction record
    const transaction = await this.createTransaction({
      customerId: customer.id,
      paymentMethodId,
      amount: PRODUCT_AMOUNT,
      type: dto.isSubscription ? 'recurring' : 'sale',
      processor,
      processorTransactionId,
    });

    let subscriptionId: string | undefined;

    // 5. If subscription, create subscription and schedule recurring billing
    if (dto.isSubscription) {
      subscriptionId = await this.createSubscription({
        customerId: customer.id,
        paymentMethodId,
        amount: PRODUCT_AMOUNT,
        frequencyDays: SUBSCRIPTION_FREQUENCY_DAYS,
        processor,
      });
    }

    return {
      success: true,
      transactionId: transaction.id,
      subscriptionId,
    };
  }

  private async getOrCreateCustomer(dto: CheckoutDto) {
    // Try to find existing customer
    const { data: existing } = await this.supabase.client
      .from('customers')
      .select('*')
      .eq('email', dto.email)
      .eq('store_id', STORE_ID)
      .single();

    if (existing) {
      // Update customer info
      const { data: updated } = await this.supabase.client
        .from('customers')
        .update({
          first_name: dto.firstName,
          last_name: dto.lastName,
          phone: dto.phone,
          address: dto.address,
          apartment: dto.apartment,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
        })
        .eq('id', existing.id)
        .select()
        .single();

      return updated!;
    }

    // Create new customer
    const { data: customer, error } = await this.supabase.client
      .from('customers')
      .insert({
        email: dto.email,
        store_id: STORE_ID,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone,
        address: dto.address,
        apartment: dto.apartment,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
      })
      .select()
      .single();

    if (error) throw error;
    return customer!;
  }

  private async selectProcessor(
    storeId: string,
  ): Promise<'stripe' | 'NMI'> {
    const { data: store } = await this.supabase.client
      .from('store')
      .select('checkout_processor, processor_split')
      .eq('id', storeId)
      .single();

    if (!store) throw new Error('Store not found');

    // If processor_split is configured, use weighted random selection
    if (store.processor_split) {
      const split = store.processor_split as Record<string, number>;
      const processors = Object.keys(split);

      if (processors.length === 0) {
        return store.checkout_processor;
      }

      // Weighted random selection
      const rand = Math.random() * 100;
      let cumulative = 0;

      for (const processor of processors) {
        cumulative += split[processor];
        if (rand < cumulative) {
          return processor as 'stripe' | 'NMI';
        }
      }
    }

    // Default to checkout_processor
    return store.checkout_processor;
  }

  private async processPayment(
    dto: CheckoutDto,
    customerId: string,
    processor: 'stripe' | 'NMI',
  ): Promise<{ paymentMethodId: string; processorTransactionId: string }> {
    if (processor === 'stripe') {
      return this.processStripePayment(dto, customerId);
    } else {
      return this.processNmiPayment(dto, customerId);
    }
  }

  private async processStripePayment(
    dto: CheckoutDto,
    customerId: string,
  ): Promise<{ paymentMethodId: string; processorTransactionId: string }> {
    // 1. Create payment intent
    const intent = this.stripe.createPaymentIntent({
      amount: Math.round(PRODUCT_AMOUNT * 100), // Convert to cents
      currency: 'usd',
      cardNumber: dto.cardNumber,
      expiry: dto.expiry,
      cvv: dto.cvv,
      metadata: { customerId },
    });

    // 2. Verify token
    const verification = this.stripe.verifyToken(intent.id);
    if (!verification.valid) {
      throw new Error('Invalid card');
    }

    // 3. Save payment method
    const { data: paymentMethod } = await this.supabase.client
      .from('payment_methods')
      .insert({
        customer_id: customerId,
        last4: verification.card!.last4,
        brand: verification.card!.brand,
        exp_month: verification.card!.expMonth,
        exp_year: verification.card!.expYear,
        processor: 'stripe',
        processor_payment_method_id: intent.id,
      })
      .select()
      .single();

    // 4. Charge payment intent (async - webhooks will update status)
    const chargeResult = this.stripe.chargePaymentIntent(intent.id, true);

    return {
      paymentMethodId: paymentMethod!.id,
      processorTransactionId: chargeResult.id,
    };
  }

  private async processNmiPayment(
    dto: CheckoutDto,
    customerId: string,
  ): Promise<{ paymentMethodId: string; processorTransactionId: string }> {
    // 1. Create customer vault
    const vault = this.nmi.createCustomerVault({
      cardNumber: dto.cardNumber,
      expiry: dto.expiry,
      cvv: dto.cvv,
      metadata: { customerId },
    });

    // 2. Save payment method
    const [expMonthStr, expYearStr] = dto.expiry.split('/');
    const { data: paymentMethod } = await this.supabase.client
      .from('payment_methods')
      .insert({
        customer_id: customerId,
        last4: vault.last4,
        brand: 'visa', // NMI doesn't return brand in mock
        exp_month: parseInt(expMonthStr, 10),
        exp_year: 2000 + parseInt(expYearStr, 10),
        processor: 'NMI',
        processor_payment_method_id: vault.id,
      })
      .select()
      .single();

    // 3. Perform sale action (async - webhooks will update status)
    const saleResult = this.nmi.customerVaultAction(
      vault.id,
      'sale',
      PRODUCT_AMOUNT,
    );

    return {
      paymentMethodId: paymentMethod!.id,
      processorTransactionId: saleResult.transactionid,
    };
  }

  private async createTransaction(params: {
    customerId: string;
    paymentMethodId: string;
    amount: number;
    type: 'sale' | 'recurring';
    processor: 'stripe' | 'NMI';
    processorTransactionId: string;
  }) {
    const { data: transaction, error } = await this.supabase.client
      .from('transactions')
      .insert({
        customer_id: params.customerId,
        store_id: STORE_ID,
        payment_method_id: params.paymentMethodId,
        amount: params.amount,
        currency: 'usd',
        type: params.type,
        status: 'processing',
        processor: params.processor,
        processor_transaction_id: params.processorTransactionId,
      })
      .select()
      .single();

    if (error) throw error;
    return transaction!;
  }

  private async createSubscription(params: {
    customerId: string;
    paymentMethodId: string;
    amount: number;
    frequencyDays: number;
    processor: 'stripe' | 'NMI';
  }): Promise<string> {
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + params.frequencyDays);

    // 1. Create subscription record
    const { data: subscription, error } = await this.supabase.client
      .from('subscriptions')
      .insert({
        customer_id: params.customerId,
        store_id: STORE_ID,
        payment_method_id: params.paymentMethodId,
        amount: params.amount,
        currency: 'usd',
        frequency_days: params.frequencyDays,
        status: 'active',
        processor: params.processor,
        next_billing_date: nextBillingDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Create EventBridge schedule for recurring billing
    const schedule = this.eventBridge.createSchedule({
      frequencyDays: params.frequencyDays,
      detail: {
        subscriptionId: subscription!.id,
        customerId: params.customerId,
        paymentMethodId: params.paymentMethodId,
        amount: params.amount,
      },
    });

    // 3. Update subscription with schedule ID
    await this.supabase.client
      .from('subscriptions')
      .update({ schedule_id: schedule.id })
      .eq('id', subscription!.id);

    this.logger.log(
      `Created subscription ${subscription!.id} with schedule ${schedule.id}`,
    );

    return subscription!.id;
  }
}
