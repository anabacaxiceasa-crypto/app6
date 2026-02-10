-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. System Settings
create table if not exists nikeflow_settings (
  id text primary key default 'default',
  app_name text default 'A.M ABACAXI',
  maintenance_mode boolean default false,
  total_crates numeric default 0
);

-- 2. Users
create table if not exists nikeflow_users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  username text,
  email text unique,
  role text check (role in ('ADMIN', 'SELLER', 'FINANCIAL')),
  password_hash text
);

-- 3. Products
create table if not exists nikeflow_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null,
  costPrice numeric not null default 0,
  stock numeric not null default 0,
  category text,
  imageUrl text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Customers
create table if not exists nikeflow_customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  crates_balance numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Sales
create table if not exists nikeflow_sales (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone default timezone('utc'::text, now()),
  customerId uuid references nikeflow_customers(id),
  customerName text,
  sellerId uuid references nikeflow_users(id),
  sellerName text,
  items jsonb, -- Stores array of SaleItem
  totalAmount numeric not null,
  globalDiscount numeric default 0,
  globalSurcharge numeric default 0,
  paymentMethod text,
  dueDate timestamp with time zone,
  status text check (status in ('PAID', 'PENDING', 'CANCELLED')),
  cratesIn numeric default 0,
  cratesOut numeric default 0
);

-- 6. Customer Payments
create table if not exists nikeflow_customer_payments (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone default timezone('utc'::text, now()),
  customerId uuid references nikeflow_customers(id),
  customerName text,
  amount numeric not null,
  method text,
  notes text
);

-- 7. Damaged Goods
create table if not exists nikeflow_damaged (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone default timezone('utc'::text, now()),
  productId uuid references nikeflow_products(id),
  productName text,
  quantity numeric not null,
  reason text
);

-- 8. Expenses
create table if not exists nikeflow_expenses (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone default timezone('utc'::text, now()),
  description text,
  amount numeric not null,
  category text
);

-- 9. Payment Methods
create table if not exists nikeflow_payment_methods (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  active boolean default true
);

-- Enable Row Level Security (RLS) on all tables
alter table nikeflow_settings enable row level security;
alter table nikeflow_users enable row level security;
alter table nikeflow_products enable row level security;
alter table nikeflow_customers enable row level security;
alter table nikeflow_sales enable row level security;
alter table nikeflow_customer_payments enable row level security;
alter table nikeflow_damaged enable row level security;
alter table nikeflow_expenses enable row level security;
alter table nikeflow_payment_methods enable row level security;

-- Create generic policies (OPEN ACCESS FOR AUTHENTICATED USERS)
-- WARNING: In a production environment, you should restrict these policies.
create policy "Enable all access for authenticated users" on nikeflow_settings for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_users for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_products for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_customers for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_sales for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_customer_payments for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_damaged for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_expenses for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on nikeflow_payment_methods for all using (auth.role() = 'authenticated');

-- Create generic policies (OPEN ACCESS FOR ANON - OPTIONAL, useful if login is not strictly enforced by Supabase Auth initially)
-- create policy "Enable read access for anon" on nikeflow_settings for select using (auth.role() = 'anon');
