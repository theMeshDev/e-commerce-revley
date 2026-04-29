import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventBridgeModule } from '../eventbridge/eventbridge.module';
import { NmiModule } from '../nmi/nmi.module';
import { StripeModule } from '../stripe/stripe.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [AuthModule, StripeModule, NmiModule, EventBridgeModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
