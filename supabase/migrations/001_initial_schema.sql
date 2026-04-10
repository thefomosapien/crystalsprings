-- ============================================================
-- Crystal Springs Campground — Initial Schema
-- Single-tenant: no tenant_id on any table
-- ============================================================

-- -----------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------

create table zones (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  display_order integer default 0
);

create table sites (
  id               uuid primary key default gen_random_uuid(),
  zone_id          uuid references zones(id),
  name             text not null,
  type             text not null,           -- 'tent' | 'rv' | 'group'
  max_people       integer,
  max_rv_length_ft integer,
  rv_orientation   text,                    -- 'pull-through' | 'back-in' | null
  hookups          text,                    -- 'none' | 'water' | 'electric_30a' | 'electric_50a' | 'full' | 'full_sewer'
  surface          text,                    -- 'grass' | 'gravel' | 'paved' | 'dirt'
  shade            text,                    -- 'full' | 'partial' | 'none'
  privacy          text,                    -- 'high' | 'medium' | 'low'
  pet_friendly     boolean default true,
  ada_accessible   boolean default false,
  fire_ring        boolean default false,
  picnic_table     boolean default false,
  river_access     boolean default false,
  walk_in_only     boolean default false,
  base_rate        decimal(8,2) not null,
  floor_rate       decimal(8,2) not null,
  ceiling_rate     decimal(8,2) not null,
  svg_x            float,                   -- normalized 0-1 map position
  svg_y            float,                   -- normalized 0-1 map position
  photos           text[] default '{}',
  notes            text,
  active           boolean default true
);

create table site_tags (
  id      uuid primary key default gen_random_uuid(),
  site_id uuid references sites(id) on delete cascade,
  key     text not null,
  value   text not null
);

create table seasons (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  start_date    date not null,
  end_date      date not null,
  bookings_open boolean default false
);

create table guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  phone         text,
  trusted       boolean default false,
  notes         text,
  booking_count integer default 0,
  last_stay     date,
  created_at    timestamptz default now()
);

create table bookings (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid references seasons(id),
  site_id          uuid references sites(id),
  guest_id         uuid references guests(id),
  arrival          date not null,
  departure        date not null,
  party_size       integer,
  status           text default 'pending',   -- 'pending' | 'approved' | 'declined' | 'cancelled'
  rate_per_night   decimal(8,2),
  total            decimal(8,2),
  rv_length_ft     integer,
  special_requests text,
  internal_notes   text,
  urgency_score    float,
  approved_at      timestamptz,
  created_at       timestamptz default now()
);

-- -----------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------

create index idx_bookings_site_dates on bookings (site_id, arrival, departure);
create index idx_bookings_status     on bookings (status);
create index idx_sites_zone          on sites (zone_id);
create index idx_guests_email        on guests (email);

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------

alter table zones     enable row level security;
alter table sites     enable row level security;
alter table site_tags enable row level security;
alter table seasons   enable row level security;
alter table guests    enable row level security;
alter table bookings  enable row level security;

-- Public (anon) policies -----------------------------------------

create policy "anon_select_zones"
  on zones for select
  to anon
  using (true);

create policy "anon_select_active_sites"
  on sites for select
  to anon
  using (active = true);

create policy "anon_select_seasons"
  on seasons for select
  to anon
  using (true);

create policy "anon_insert_guests"
  on guests for insert
  to anon
  with check (true);

create policy "anon_insert_bookings"
  on bookings for insert
  to anon
  with check (status = 'pending');

-- Authenticated (admin/staff) policies ---------------------------

create policy "auth_all_zones"
  on zones for all
  to authenticated
  using (true)
  with check (true);

create policy "auth_all_sites"
  on sites for all
  to authenticated
  using (true)
  with check (true);

create policy "auth_all_site_tags"
  on site_tags for all
  to authenticated
  using (true)
  with check (true);

create policy "auth_all_seasons"
  on seasons for all
  to authenticated
  using (true)
  with check (true);

create policy "auth_all_guests"
  on guests for all
  to authenticated
  using (true)
  with check (true);

create policy "auth_all_bookings"
  on bookings for all
  to authenticated
  using (true)
  with check (true);

-- -----------------------------------------------------------
-- SEED DATA
-- -----------------------------------------------------------

-- Zones
insert into zones (id, name, description, display_order) values
  ('a1111111-1111-1111-1111-111111111111', 'River Loop',  'Sites along the north fork of Crystal Creek', 1),
  ('b2222222-2222-2222-2222-222222222222', 'Central',     'Easy-access sites near the lodge and bathhouse', 2),
  ('c3333333-3333-3333-3333-333333333333', 'East Loop',   'Spacious group and overflow sites on the east ridge', 3);

-- Sites
insert into sites (id, zone_id, name, type, max_people, max_rv_length_ft, rv_orientation, hookups, shade, privacy, fire_ring, picnic_table, river_access, base_rate, floor_rate, ceiling_rate) values
  (
    'd4444444-4444-4444-4444-444444444444',
    'a1111111-1111-1111-1111-111111111111',
    'Site 1', 'tent', 4, null, null,
    'water', 'full', 'high',
    true, true, true,
    42.00, 30.00, 60.00
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'a1111111-1111-1111-1111-111111111111',
    'Site 2', 'rv', 6, 40, 'pull-through',
    'full', null, null,
    false, false, true,
    65.00, 50.00, 90.00
  ),
  (
    'f6666666-6666-6666-6666-666666666666',
    'b2222222-2222-2222-2222-222222222222',
    'Site 3', 'tent', 4, null, null,
    'none', 'partial', null,
    true, false, false,
    35.00, 25.00, 50.00
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    'b2222222-2222-2222-2222-222222222222',
    'Site 4', 'rv', 6, 45, 'back-in',
    'electric_50a', null, null,
    false, false, false,
    60.00, 45.00, 85.00
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'c3333333-3333-3333-3333-333333333333',
    'Site 5', 'group', 30, null, null,
    'full', null, null,
    true, true, false,
    150.00, 120.00, 200.00
  );

-- Season
insert into seasons (id, label, start_date, end_date, bookings_open) values
  ('99999999-9999-9999-9999-999999999999', '2026 Season', '2026-08-01', '2026-09-27', true);

-- Sample guest for seed bookings
insert into guests (id, name, email, phone, trusted) values
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Seed Camper', 'seed@example.com', '208-555-0100', true);

-- Two bookings on Site 1 with a 3-night gap (Aug 4–7) for pricing engine testing
insert into bookings (id, season_id, site_id, guest_id, arrival, departure, party_size, status, rate_per_night, total, approved_at) values
  (
    'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '99999999-9999-9999-9999-999999999999',
    'd4444444-4444-4444-4444-444444444444',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-08-01', '2026-08-04', 2, 'approved',
    42.00, 126.00, now()
  ),
  (
    'cccc2222-cccc-cccc-cccc-cccccccccccc',
    '99999999-9999-9999-9999-999999999999',
    'd4444444-4444-4444-4444-444444444444',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-08-07', '2026-08-14', 2, 'approved',
    42.00, 294.00, now()
  );
