-- GazFlow operations: customers order from their own app, drivers work from theirs,
-- and the office watches. Every person reaches the system through a secret link
-- (token), so there are no passwords. Rows are never deleted: orders are cancelled
-- with a reason, and every change is written to ops_events.

create table if not exists ops_business (
  id text primary key default 'main',
  name text not null default 'גזפלו',
  phone text not null default '',
  -- Orders created before this hour (Israel time) are served the same day.
  cutoff_hour integer not null default 10,
  -- Debt above this (₪) keeps a new order for the office to approve.
  debt_threshold numeric not null default 400,
  owner_token text not null unique,
  -- Last date the daily housekeeping ran (carry-over of unfinished stops).
  last_tick date
);

create table if not exists ops_cylinder_types (
  code text primary key,
  name_he text not null,
  name_ar text not null,
  price numeric not null,
  default_cycle_days integer not null,
  sort integer not null default 0
);

create table if not exists ops_customers (
  id text primary key,
  name text not null,
  phone text not null unique,
  lang text not null default 'ar' check (lang in ('ar', 'he')),
  token text not null unique,
  -- Manual override of the refill cycle; null = computed from deliveries.
  cycle_days integer,
  -- Open balance in ₪ (debt). Payments and debts move it; nothing overwrites it.
  balance numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ops_addresses (
  id text primary key,
  customer_id text not null references ops_customers (id),
  street text not null,
  house_no text not null default '',
  zone text not null default '',
  floor text not null default '',
  entry_code text not null default '',
  note text not null default '',
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- What the customer has at home, per cylinder type.
create table if not exists ops_customer_cylinders (
  customer_id text not null references ops_customers (id),
  type_code text not null references ops_cylinder_types (code),
  held integer not null default 0,
  empties_owed integer not null default 0,
  last_delivery date,
  primary key (customer_id, type_code)
);

create table if not exists ops_drivers (
  id text primary key,
  name text not null,
  phone text not null default '',
  lang text not null default 'ar' check (lang in ('ar', 'he')),
  token text not null unique,
  -- Zones this driver serves; empty = every zone.
  zones text[] not null default '{}',
  capacity integer not null default 20,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ops_orders (
  id text primary key,
  customer_id text not null references ops_customers (id),
  address_id text not null references ops_addresses (id),
  type_code text not null references ops_cylinder_types (code),
  qty integer not null check (qty > 0),
  kind text not null default 'exchange' check (kind in ('exchange', 'install', 'pickup')),
  status text not null default 'new'
    check (status in ('new', 'assigned', 'on_the_way', 'delivered', 'failed', 'cancelled')),
  -- Why a 'new' order is waiting for the office (null = nothing blocks it).
  hold_reason text,
  driver_id text references ops_drivers (id),
  stop_seq integer,
  service_date date not null,
  time_window text not null default 'any' check (time_window in ('morning', 'noon', 'afternoon', 'any')),
  unit_price numeric not null,
  source text not null default 'app' check (source in ('app', 'office')),
  delivered_qty integer,
  collected_empties integer,
  payment text not null default 'pending'
    check (payment in ('pending', 'cash', 'transfer_claimed', 'transfer_confirmed', 'debt')),
  amount numeric not null default 0,
  fail_reason text,
  fail_count integer not null default 0,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists ops_orders_day on ops_orders (service_date, status);
create index if not exists ops_orders_customer on ops_orders (customer_id, created_at desc);
-- One open order per customer, enforced by the database: two taps at the same moment
-- cannot send two trucks.
create unique index if not exists ops_orders_one_open on ops_orders (customer_id)
  where status in ('new', 'assigned', 'on_the_way', 'failed');

create table if not exists ops_events (
  id text primary key,
  order_id text references ops_orders (id),
  customer_id text references ops_customers (id),
  actor text not null,
  kind text not null,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);

create index if not exists ops_events_at on ops_events (at desc);

-- A customer pressed "call" in the app: the office sees who is about to ring.
create table if not exists ops_call_taps (
  id text primary key,
  customer_id text not null references ops_customers (id),
  at timestamptz not null default now(),
  handled boolean not null default false
);
