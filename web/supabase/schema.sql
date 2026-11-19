-- EMO STORE — Supabase schema.
-- Run this in Supabase SQL Editor before deploying. The app uses the service
-- role key on the server only, so RLS can stay enabled with no public policies.

create extension if not exists pgcrypto;

create table if not exists categories (
  id bigint primary key,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists products (
  id bigint primary key,
  name text not null,
  slug text not null unique,
  description text,
  details text,
  price numeric(12, 2) not null default 0,
  compare_at_price numeric(12, 2),
  stock integer not null default 0,
  image_url text,
  gallery text,
  sizes text,
  colors text,
  category_id bigint references categories(id) on delete set null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  rating numeric(3, 2),
  reviews_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value text not null default ''
);

create table if not exists shipping_governorates (
  id bigint primary key,
  name text not null unique,
  fee numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists payment_methods (
  id bigint primary key,
  code text not null unique,
  name text not null,
  description text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  governorate text not null,
  city text not null,
  address text not null,
  notes text,
  payment_method text not null,
  payment_status text not null default 'pending',
  subtotal numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'pending',
  stock_restored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint not null,
  product_name text not null,
  image_url text,
  size text,
  color text,
  unit_price numeric(12, 2) not null default 0,
  quantity integer not null default 1,
  line_total numeric(12, 2) not null default 0
);

alter table categories enable row level security;
alter table products enable row level security;
alter table settings enable row level security;
alter table shipping_governorates enable row level security;
alter table payment_methods enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- The app connects with the service_role key from the server only. New tables
-- created via the SQL Editor do not inherit these grants automatically.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_order_items_order_id on order_items (order_id);
create index if not exists idx_products_category on products (category_id);
