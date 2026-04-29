import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/types';
import {
  CheckoutProcessorDto,
  IntegrationDto,
  ProcessorSplitDto,
  StoreSettingsDto,
  SubscriptionDto,
  TransactionDto,
  UpdateCheckoutProcessorDto,
  UpdateIntegrationDto,
  UpdateProcessorSplitDto,
} from './merchant.dto';
import { MerchantService } from './merchant.service';

@ApiTags('Merchant')
@ApiBearerAuth('jwt-auth')
@UseGuards(JwtAuthGuard)
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}
  /**
   * Return all integrations for the authenticated merchant's store.
   */
  @Get('integrations')
  @ApiOperation({ summary: 'List integrations' })
  @ApiResponse({ status: 200, type: [IntegrationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getIntegrations(@Request() req: RequestWithUser): Promise<IntegrationDto[]> {
    return this.merchantService.getIntegrations(req.user!.storeId);
  }

  /**
   * Update an integration's status and/or credentials.
   */
  @Patch('integrations/:id')
  @ApiOperation({ summary: 'Update integration' })
  @ApiResponse({ status: 200, type: IntegrationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  updateIntegration(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
  ): Promise<IntegrationDto> {
    return this.merchantService.updateIntegration(req.user!.storeId, id, dto);
  }

  /**
   * Return the checkout processor setting for the merchant's store.
   */
  @Get('checkout-processor')
  @ApiOperation({ summary: 'Get checkout processor' })
  @ApiResponse({ status: 200, type: CheckoutProcessorDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCheckoutProcessor(
    @Request() req: RequestWithUser,
  ): Promise<CheckoutProcessorDto> {
    return this.merchantService.getCheckoutProcessor(req.user!.storeId);
  }

  /**
   * Update the checkout processor setting for the merchant's store.
   */
  @Patch('checkout-processor')
  @ApiOperation({ summary: 'Set checkout processor' })
  @ApiResponse({ status: 200, type: CheckoutProcessorDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateCheckoutProcessor(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateCheckoutProcessorDto,
  ): Promise<CheckoutProcessorDto> {
    return this.merchantService.updateCheckoutProcessor(req.user!.storeId, dto);
  }

  /**
   * Update the processor split configuration for the merchant's store.
   */
  @Patch('processor-split')
  @ApiOperation({
    summary: 'Update processor split',
    description:
      'Configure percentage-based routing across payment processors. ' +
      'Percentages must sum to 100. Example: { stripe: 70, NMI: 30 }',
  })
  @ApiResponse({ status: 200, type: ProcessorSplitDto })
  @ApiResponse({ status: 400, description: 'Invalid split configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProcessorSplit(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProcessorSplitDto,
  ): Promise<ProcessorSplitDto> {
    return this.merchantService.updateProcessorSplit(req.user!.storeId, dto);
  }

  /**
   * Return all transactions for the authenticated merchant's store.
   */
  @Get('transactions')
  @ApiOperation({
    summary: 'List transactions',
    description:
      "Returns all transactions for the merchant's store, " +
      'joined with customer data. Requires authentication. Supports pagination.',
  })
  @ApiResponse({ status: 200, type: [TransactionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactions(
    @Request() req: RequestWithUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<TransactionDto[]> {
    return this.merchantService.getTransactions(req.user!.storeId, limit, offset);
  }

  /**
   * Return all subscriptions for the authenticated merchant's store.
   */
  @Get('subscriptions')
  @ApiOperation({
    summary: 'List subscriptions',
    description:
      "Returns all active and inactive subscriptions for the merchant's store. " +
      'Requires authentication. Supports pagination.',
  })
  @ApiResponse({ status: 200, type: [SubscriptionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSubscriptions(
    @Request() req: RequestWithUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<SubscriptionDto[]> {
    return this.merchantService.getSubscriptions(req.user!.storeId, limit, offset);
  }

  /**
   * Return the merchant's store configuration.
   */
  @Get('store-settings')
  @ApiOperation({
    summary: 'Get store settings',
    description:
      "Returns the merchant's store configuration including active payment processor, " +
      'processor split percentages, subscription settings, and integration credentials.',
  })
  @ApiResponse({ status: 200, type: StoreSettingsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStoreSettings(@Request() req: RequestWithUser): Promise<StoreSettingsDto> {
    return this.merchantService.getStoreSettings(req.user!.storeId);
  }
}
