import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Constants, Enums, Tables } from '../common/database/database.types';

type CheckoutProcessor = Enums<'checkout_processor'>;
const CHECKOUT_PROCESSORS = Constants.public.Enums.checkout_processor;

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * The base DB row is Tables<'transactions'> — candidates must extend the
 * transactions table with columns like amount, type, state, processor, etc.
 * This DTO mirrors the expected extended shape for the API response.
 */
export class TransactionDto {
  @ApiProperty({ example: 'txn_abc123' })
  id: string;

  /** customer_id FK from transactions table */
  @ApiProperty({ example: 'cus_abc123' })
  customer_id: string;

  @ApiProperty({ example: 99.99 })
  amount: number;

  @ApiProperty({ enum: ['sale', 'recurring'] })
  type: 'sale' | 'recurring';

  @ApiProperty({ enum: ['captured', 'failed', 'auth', 'pending'] })
  state: 'captured' | 'failed' | 'auth' | 'pending';

  @ApiProperty({ enum: CHECKOUT_PROCESSORS })
  processor: CheckoutProcessor;

  @ApiProperty({ example: '2026-03-30' })
  created_at: string;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * The base DB row is Tables<'subscriptions'> — candidates must extend the
 * subscriptions table with columns like amount, status, processor, next_billing_date, etc.
 */
export class SubscriptionDto {
  @ApiProperty({ example: 'sub_abc123' })
  id: string;

  @ApiProperty({ example: 'cus_abc123' })
  customer_id: string;

  @ApiProperty({ example: 99.99 })
  amount: number;

  @ApiProperty({ enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';

  @ApiProperty({ enum: CHECKOUT_PROCESSORS })
  processor: CheckoutProcessor;

  @ApiProperty({ example: '2026-04-30' })
  next_billing_date: string;

  @ApiProperty({ example: '2026-03-30' })
  created_at: string;
}

// ---------------------------------------------------------------------------
// Store settings
// ---------------------------------------------------------------------------

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    description: 'Processor credentials as key-value pairs',
  })
  creds?: Record<string, string>;
}

export class IntegrationDto {
  @ApiProperty({ example: 'int_abc123' })
  id: string;

  @ApiProperty({ enum: ['stripe', 'NMI', 'shopify'] })
  type: Tables<'integrations'>['type'];

  @ApiProperty({ enum: ['active', 'inactive'] })
  status: Tables<'integrations'>['status'];

  @ApiProperty({
    description: 'Processor credentials (sensitive fields should be masked)',
  })
  creds: Tables<'integrations'>['creds'];
}

export class CheckoutProcessorDto {
  @ApiProperty({ enum: CHECKOUT_PROCESSORS, example: 'stripe' })
  checkoutProcessor: CheckoutProcessor;
}

export class UpdateCheckoutProcessorDto {
  @ApiProperty({ enum: CHECKOUT_PROCESSORS })
  checkoutProcessor: CheckoutProcessor;
}

export class UpdateProcessorSplitDto {
  @ApiProperty({
    description:
      'Percentage split across processors. Must sum to 100. Example: { stripe: 70, NMI: 30 }',
    example: { stripe: 70, NMI: 30 },
  })
  processorSplit: Record<string, number>;
}

export class ProcessorSplitDto {
  @ApiProperty({
    description: 'Current processor split configuration',
    example: { stripe: 70, NMI: 30 },
  })
  processorSplit: Record<string, number>;
}

export class SubscriptionSettingsDto {
  @ApiProperty({ enum: ['monthly', 'weekly', 'yearly'], example: 'monthly' })
  frequency: 'monthly' | 'weekly' | 'yearly';

  @ApiProperty({
    example: 10,
    description: 'Percentage discount applied to subscription orders',
  })
  discountPercent: number;
}

export class StoreSettingsDto {
  @ApiProperty({ example: 'str_abc123' })
  storeId: string;

  @ApiProperty({ example: 'Acme Store' })
  storeName: string;

  @ApiProperty({
    enum: CHECKOUT_PROCESSORS,
    description: 'Active checkout processor',
  })
  checkoutProcessor: CheckoutProcessor;

  @ApiPropertyOptional({
    description:
      'Percentage split across processors, e.g. { stripe: 70, NMI: 30 }',
    example: { stripe: 70, NMI: 30 },
  })
  processorSplit?: Record<string, number>;

  @ApiProperty({ type: SubscriptionSettingsDto })
  subscriptionSettings: SubscriptionSettingsDto;

  @ApiProperty({ type: [IntegrationDto] })
  integrations: IntegrationDto[];
}
