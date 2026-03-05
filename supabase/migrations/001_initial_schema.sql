-- GreenPack Initial Schema
-- Run this in the Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'courier', 'admin')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SHOPS
-- ============================================================
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  short_description text,
  category_id text,
  category_name text,
  location jsonb default '{}',
  contact jsonb default '{}',
  hours jsonb default '{}',
  images jsonb default '{}',
  video jsonb default '{}',
  tags text[] default '{}',
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shops_category_id_idx on public.shops(category_id);
create index if not exists shops_is_featured_idx on public.shops(is_featured);
create index if not exists shops_owner_id_idx on public.shops(owner_id);
create index if not exists shops_slug_idx on public.shops(slug);

-- ============================================================
-- SERVICES
-- ============================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null,
  price_type text not null default 'fixed' check (price_type in ('fixed', 'starting_from', 'per_hour', 'negotiable')),
  duration text,
  category_id text,
  image text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists services_shop_id_idx on public.services(shop_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null,
  original_price numeric(12,2),
  image text,
  category_id text,
  in_stock boolean not null default true,
  quantity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_shop_id_idx on public.products(shop_id);
create index if not exists products_in_stock_idx on public.products(in_stock);

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled')),
  total_amount numeric(12,2) not null,
  customer_info jsonb not null default '{}',
  needs_delivery boolean not null default false,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'service')),
  item_id uuid,
  name text not null,
  price numeric(12,2) not null,
  quantity int not null default 1,
  image text,
  notes text
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_shop_id_idx on public.order_items(shop_id);

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_avatar text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_shop_id_idx on public.reviews(shop_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);

-- Auto-update shop rating when review added
create or replace function public.update_shop_rating()
returns trigger as $$
begin
  update public.shops
  set
    rating = (select avg(rating)::numeric(3,2) from public.reviews where shop_id = coalesce(new.shop_id, old.shop_id)),
    review_count = (select count(*) from public.reviews where shop_id = coalesce(new.shop_id, old.shop_id))
  where id = coalesce(new.shop_id, old.shop_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_shop_rating();

-- ============================================================
-- COURIERS
-- ============================================================
create table if not exists public.couriers (
  id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type text not null check (vehicle_type in ('bike', 'car', 'bicycle')),
  is_verified boolean not null default false,
  is_available boolean not null default false,
  rating numeric(3,2) not null default 0,
  total_deliveries int not null default 0,
  current_lat numeric(9,6),
  current_lng numeric(9,6),
  nin text,
  guarantor_name text,
  guarantor_phone text,
  area_of_operation text,
  availability_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DELIVERIES
-- ============================================================
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_id uuid references public.couriers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'assigned', 'picking_up', 'at_shop', 'returning', 'delivered', 'cancelled')),
  pickup_address jsonb not null default '{}',
  shop_address jsonb default '{}',
  delivery_address jsonb not null default '{}',
  courier_fee numeric(10,2) not null default 0,
  items_description text,
  special_instructions text,
  pickup_time timestamptz,
  estimated_return_time timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliveries_order_id_idx on public.deliveries(order_id);
create index if not exists deliveries_courier_id_idx on public.deliveries(courier_id);
create index if not exists deliveries_status_idx on public.deliveries(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'order', 'delivery', 'review', 'system')),
  is_read boolean not null default false,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.couriers enable row level security;
alter table public.deliveries enable row level security;
alter table public.notifications enable row level security;

-- PROFILES
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- SHOPS (public read, owner write)
create policy "shops_select_all" on public.shops for select using (true);
create policy "shops_insert_owner" on public.shops for insert with check (auth.uid() = owner_id);
create policy "shops_update_owner" on public.shops for update using (auth.uid() = owner_id);
create policy "shops_delete_owner" on public.shops for delete using (auth.uid() = owner_id);

-- SERVICES (public read, shop owner write)
create policy "services_select_all" on public.services for select using (true);
create policy "services_insert_owner" on public.services for insert
  with check (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));
create policy "services_update_owner" on public.services for update
  using (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));
create policy "services_delete_owner" on public.services for delete
  using (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));

-- PRODUCTS (public read, shop owner write)
create policy "products_select_all" on public.products for select using (true);
create policy "products_insert_owner" on public.products for insert
  with check (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));
create policy "products_update_owner" on public.products for update
  using (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));
create policy "products_delete_owner" on public.products for delete
  using (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));

-- ORDERS
create policy "orders_select_customer" on public.orders for select using (auth.uid() = customer_id);
create policy "orders_insert_customer" on public.orders for insert with check (auth.uid() = customer_id);
create policy "orders_update_vendor" on public.orders for update
  using (
    auth.uid() = customer_id
    or exists (
      select 1 from public.order_items oi
      join public.shops s on s.id = oi.shop_id
      where oi.order_id = orders.id and s.owner_id = auth.uid()
    )
  );

-- ORDER ITEMS
create policy "order_items_select" on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or exists (
      select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()
    )
  );
create policy "order_items_insert" on public.order_items for insert with check (true);

-- REVIEWS
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_auth" on public.reviews for insert with check (auth.uid() is not null);
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = customer_id);
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = customer_id);

-- COURIERS
create policy "couriers_select_all" on public.couriers for select using (true);
create policy "couriers_insert_own" on public.couriers for insert with check (auth.uid() = id);
create policy "couriers_update_own" on public.couriers for update using (auth.uid() = id);

-- DELIVERIES
create policy "deliveries_select_relevant" on public.deliveries for select
  using (
    courier_id = auth.uid()
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or exists (
      select 1 from public.order_items oi
      join public.shops s on s.id = oi.shop_id
      where oi.order_id = order_id and s.owner_id = auth.uid()
    )
  );
create policy "deliveries_insert_customer" on public.deliveries for insert with check (true);
create policy "deliveries_update_courier" on public.deliveries for update
  using (courier_id = auth.uid() or exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
  ));

-- NOTIFICATIONS
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_insert" on public.notifications for insert with check (true);
