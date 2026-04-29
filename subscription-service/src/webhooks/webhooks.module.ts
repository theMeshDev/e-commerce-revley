import { Module } from '@nestjs/common';
import { NmiModule } from '../nmi/nmi.module';
import { StripeModule } from '../stripe/stripe.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [StripeModule, NmiModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
