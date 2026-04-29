-- Add fields to customers table
alter table public.customers
  add column first_name text,
  add column last_name text,
  add column phone text,
  add column address text,
  add column apartment text,
  add column city text,
  add column state text,
  add column zip text;

-- Add fields to payment_methods table
alter table public.payment_methods
  add column last4 text not null,
  add column brand text not null,
  add column exp_month integer not null,
  add column exp_year integer not null,
  add column processor public.checkout_processor not null,
  add column processor_payment_method_id text not null;

-- Transaction type and status enums
create type public.transaction_type as enum ('sale', 'auth', 'capture', 'recurring');
create type public.transaction_status as enum ('pending', 'processing', 'succeeded', 'failed', 'authorized');

-- Add fields to transactions table
alter table public.transactions
  add column store_id uuid references public.store(id) on delete cascade,
  add column payment_method_id uuid references public.payment_methods(id) on delete set null,
  add column amount numeric(10, 2) not null,
  add column currency text not null default 'usd',
  add column type public.transaction_type not null,
  add column status public.transaction_status not null default 'pending',
  add column processor public.checkout_processor not null,
  add column processor_transaction_id text,
  add column error_message text,
  add column updated_at timestamptz not null default now();

-- Add index for querying transactions by store
create index idx_transactions_store_id on public.transactions(store_id, created_at desc);

-- Subscription status enum
create type public.subscription_status as enum ('active', 'inactive', 'cancelled');

-- Add fields to subscriptions table
alter table public.subscriptions
  add column store_id uuid references public.store(id) on delete cascade,
  add column payment_method_id uuid not null references public.payment_methods(id) on delete cascade,
  add column amount numeric(10, 2) not null,
  add column currency text not null default 'usd',
  add column frequency_days integer not null,
  add column status public.subscription_status not null default 'active',
  add column processor public.checkout_processor not null,
  add column schedule_id text,
  add column next_billing_date timestamptz not null,
  add column updated_at timestamptz not null default now();

-- Add index for querying subscriptions by store
create index idx_subscriptions_store_id on public.subscriptions(store_id, created_at desc);

-- Add processor split configuration to store table
alter table public.store
  add column processor_split jsonb;

-- Set default split to 100% on current checkout_processor
update public.store
set processor_split = jsonb_build_object(checkout_processor, 100);
