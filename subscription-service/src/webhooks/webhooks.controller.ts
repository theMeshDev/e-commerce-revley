import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  EventBridgeWebhookDto,
  NmiWebhookDto,
  StripeWebhookDto,
} from './webhooks.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Stripe sends async charge / capture results here.
   */
  @Post('stripe')
  @ApiOperation({
    summary: 'Stripe webhook receiver',
    description:
      'Receives async Stripe events (charge.succeeded, charge.failed, ' +
      'payment_intent.succeeded, etc.) and updates transaction state.',
  })
  @ApiResponse({ status: 200, description: 'Acknowledged' })
  async stripeWebhook(@Body() dto: StripeWebhookDto): Promise<void> {
    await this.webhooksService.handleStripeWebhook(dto);
  }

  /**
   * NMI sends async vault action results here.
   */
  @Post('nmi')
  @ApiOperation({
    summary: 'NMI webhook receiver',
    description:
      'Receives async NMI customer vault action results (sale, auth, capture, validate) ' +
      'and updates transaction / payment method state.',
  })
  @ApiResponse({ status: 200, description: 'Acknowledged' })
  async nmiWebhook(@Body() dto: NmiWebhookDto): Promise<void> {
    await this.webhooksService.handleNmiWebhook(dto);
  }

  /**
   * EventBridge fires scheduled subscription billing events here.
   */
  @Post('eventbridge')
  @ApiOperation({
    summary: 'EventBridge scheduled event receiver',
    description:
      'Receives EventBridge scheduled events for subscription billing. ' +
      'Looks up the subscription, re-charges the customer, and records the transaction.',
  })
  @ApiResponse({ status: 200, description: 'Acknowledged' })
  async eventBridgeWebhook(@Body() dto: EventBridgeWebhookDto): Promise<void> {
    await this.webhooksService.handleEventBridgeWebhook(dto);
  }
}
