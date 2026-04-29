import { Injectable, Logger } from '@nestjs/common';
import { SupabaseAdminService } from '../auth/services/supabase-admin.service';
import { NmiService } from '../nmi/nmi.service';
import { StripeService } from '../stripe/stripe.service';
import {
  EventBridgeWebhookDto,
  NmiWebhookDto,
  StripeWebhookDto,
} from './webhooks.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly supabase: SupabaseAdminService,
    private readonly stripe: StripeService,
    private readonly nmi: NmiService,
  ) {}

  async handleStripeWebhook(dto: StripeWebhookDto): Promise<void> {
    this.logger.log(`Received Stripe webhook: ${dto.type}`);

    switch (dto.type) {
      case 'charge.succeeded':
      case 'payment_intent.succeeded':
        await this.handleStripeSuccess(dto);
        break;
      case 'charge.failed':
        await this.handleStripeFailed(dto);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${dto.type}`);
    }
  }

  async handleNmiWebhook(dto: NmiWebhookDto): Promise<void> {
    this.logger.log(`Received NMI webhook: ${dto['transaction-type']}`);

    const isSuccess = dto['response-code'] === '100';

    if (isSuccess) {
      await this.handleNmiSuccess(dto);
    } else {
      await this.handleNmiFailed(dto);
    }
  }

  async handleEventBridgeWebhook(dto: EventBridgeWebhookDto): Promise<void> {
    this.logger.log('Received EventBridge scheduled event');

    const { subscriptionId, paymentMethodId, amount } = dto.detail;

    // 1. Get subscription details
    const { data: subscription } = await this.supabase.client
      .from('subscriptions')
      .select('*, payment_methods(*), customers(*)')
      .eq('id', subscriptionId)
      .single();

    if (!subscription || subscription.status !== 'active') {
      this.logger.warn(`Subscription ${subscriptionId} not active, skipping`);
      return;
    }

    // 2. Process recurring charge
    const processor = subscription.processor as 'stripe' | 'NMI';
    let processorTransactionId: string;

    if (processor === 'stripe') {
      // Charge the existing payment intent
      const chargeResult = this.stripe.chargePaymentIntent(
        subscription.payment_methods.processor_payment_method_id,
        true,
      );
      processorTransactionId = chargeResult.id;
    } else {
      // NMI: perform sale action on vault
      const saleResult = this.nmi.customerVaultAction(
        subscription.payment_methods.processor_payment_method_id,
        'sale',
        amount,
      );
      processorTransactionId = saleResult.transactionid;
    }

    // 3. Create transaction record
    await this.supabase.client.from('transactions').insert({
      customer_id: subscription.customer_id,
      store_id: subscription.store_id,
      payment_method_id: paymentMethodId,
      amount,
      currency: 'usd',
      type: 'recurring',
      status: 'processing',
      processor,
      processor_transaction_id: processorTransactionId,
    });

    // 4. Update next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setDate(
      nextBillingDate.getDate() + subscription.frequency_days,
    );

    await this.supabase.client
      .from('subscriptions')
      .update({
        next_billing_date: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    this.logger.log(
      `Recurring charge created for subscription ${subscriptionId}`,
    );
  }

  private async handleStripeSuccess(dto: StripeWebhookDto): Promise<void> {
    const paymentIntentId =
      dto.type === 'charge.succeeded'
        ? dto.data.object.payment_intent
        : dto.data.object.id;

    // Update transaction status
    const { error } = await this.supabase.client
      .from('transactions')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('processor_transaction_id', paymentIntentId);

    if (error) {
      this.logger.error(`Failed to update transaction: ${error.message}`);
    } else {
      this.logger.log(`Transaction ${paymentIntentId} marked as succeeded`);
    }
  }

  private async handleStripeFailed(dto: StripeWebhookDto): Promise<void> {
    const paymentIntentId = dto.data.object.payment_intent;

    // Update transaction status
    const { error } = await this.supabase.client
      .from('transactions')
      .update({
        status: 'failed',
        error_message: 'Card declined',
        updated_at: new Date().toISOString(),
      })
      .eq('processor_transaction_id', paymentIntentId);

    if (error) {
      this.logger.error(`Failed to update transaction: ${error.message}`);
    } else {
      this.logger.log(`Transaction ${paymentIntentId} marked as failed`);
    }
  }

  private async handleNmiSuccess(dto: NmiWebhookDto): Promise<void> {
    const transactionId = dto.transactionid;

    // Update transaction status
    const { error } = await this.supabase.client
      .from('transactions')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('processor_transaction_id', transactionId);

    if (error) {
      this.logger.error(`Failed to update transaction: ${error.message}`);
    } else {
      this.logger.log(`Transaction ${transactionId} marked as succeeded`);
    }
  }

  private async handleNmiFailed(dto: NmiWebhookDto): Promise<void> {
    const transactionId = dto.transactionid;

    // Update transaction status
    const { error } = await this.supabase.client
      .from('transactions')
      .update({
        status: 'failed',
        error_message: `NMI declined (code: ${dto['response-code']})`,
        updated_at: new Date().toISOString(),
      })
      .eq('processor_transaction_id', transactionId);

    if (error) {
      this.logger.error(`Failed to update transaction: ${error.message}`);
    } else {
      this.logger.log(`Transaction ${transactionId} marked as failed`);
    }
  }
}
