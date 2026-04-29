import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseAdminService } from '../auth/services/supabase-admin.service';
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

@Injectable()
export class MerchantService {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async getIntegrations(storeId: string): Promise<IntegrationDto[]> {
    const { data, error } = await this.supabase.client
      .from('integrations')
      .select('id, type, status, creds')
      .eq('store_id', storeId);

    if (error) throw error;
    return data as IntegrationDto[];
  }

  async updateIntegration(
    storeId: string,
    integrationId: string,
    dto: UpdateIntegrationDto,
  ): Promise<IntegrationDto> {
    const updates: Record<string, unknown> = {};
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.creds !== undefined) updates.creds = dto.creds;

    const { data, error } = await this.supabase.client
      .from('integrations')
      .update(updates)
      .eq('id', integrationId)
      .eq('store_id', storeId)
      .select('id, type, status, creds')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    return data as IntegrationDto;
  }

  async getCheckoutProcessor(storeId: string): Promise<CheckoutProcessorDto> {
    const { data, error } = await this.supabase.client
      .from('store')
      .select('checkout_processor')
      .eq('id', storeId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }

    return {
      checkoutProcessor:
        data.checkout_processor as CheckoutProcessorDto['checkoutProcessor'],
    };
  }

  async updateCheckoutProcessor(
    storeId: string,
    dto: UpdateCheckoutProcessorDto,
  ): Promise<CheckoutProcessorDto> {
    const { data, error } = await this.supabase.client
      .from('store')
      .update({ checkout_processor: dto.checkoutProcessor })
      .eq('id', storeId)
      .select('checkout_processor')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }

    return {
      checkoutProcessor:
        data.checkout_processor as CheckoutProcessorDto['checkoutProcessor'],
    };
  }

  async getTransactions(
    storeId: string,
    limit = 50,
    offset = 0,
  ): Promise<TransactionDto[]> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Map DB fields to DTO format (state instead of status for API compatibility)
    return (data || []).map((txn) => ({
      id: txn.id,
      customer_id: txn.customer_id,
      amount: parseFloat(txn.amount as string),
      type: txn.type as 'sale' | 'recurring',
      state: this.mapTransactionStatus(txn.status as string),
      processor: txn.processor as 'stripe' | 'NMI',
      created_at: txn.created_at,
    }));
  }

  async getSubscriptions(
    storeId: string,
    limit = 50,
    offset = 0,
  ): Promise<SubscriptionDto[]> {
    const { data, error } = await this.supabase.client
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).map((sub) => ({
      id: sub.id,
      customer_id: sub.customer_id,
      amount: parseFloat(sub.amount as string),
      status: sub.status as 'active' | 'inactive',
      processor: sub.processor as 'stripe' | 'NMI',
      next_billing_date: sub.next_billing_date,
      created_at: sub.created_at,
    }));
  }

  async updateProcessorSplit(
    storeId: string,
    dto: UpdateProcessorSplitDto,
  ): Promise<ProcessorSplitDto> {
    // Validate that percentages sum to 100
    const total = Object.values(dto.processorSplit).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException('Processor split percentages must sum to 100');
    }

    // Validate all processors are valid
    const validProcessors = ['stripe', 'NMI'];
    for (const processor of Object.keys(dto.processorSplit)) {
      if (!validProcessors.includes(processor)) {
        throw new BadRequestException(`Invalid processor: ${processor}`);
      }
    }

    const { data, error } = await this.supabase.client
      .from('store')
      .update({ processor_split: dto.processorSplit })
      .eq('id', storeId)
      .select('processor_split')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }

    return {
      processorSplit: data.processor_split as Record<string, number>,
    };
  }

  async getStoreSettings(storeId: string): Promise<StoreSettingsDto> {
    const { data: store, error: storeError } = await this.supabase.client
      .from('store')
      .select('id, name, checkout_processor, processor_split')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }

    const integrations = await this.getIntegrations(storeId);

    return {
      storeId: store.id,
      storeName: store.name,
      checkoutProcessor: store.checkout_processor as 'stripe' | 'NMI',
      processorSplit: store.processor_split as Record<string, number> | undefined,
      subscriptionSettings: {
        frequency: 'monthly', // Hard-coded for this challenge
        discountPercent: 0,
      },
      integrations,
    };
  }

  private mapTransactionStatus(
    status: string,
  ): 'captured' | 'failed' | 'auth' | 'pending' {
    // Map internal status to API status
    const statusMap: Record<string, 'captured' | 'failed' | 'auth' | 'pending'> = {
      succeeded: 'captured',
      failed: 'failed',
      authorized: 'auth',
      pending: 'pending',
      processing: 'pending',
    };
    return statusMap[status] || 'pending';
  }
}
