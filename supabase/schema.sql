-- ============================================================
-- AutoHub — full database setup for Supabase (v3)
-- Run this ONCE in a FRESH Supabase project: SQL Editor → Run
-- Then run seed-cities.sql, and node supabase/seed-brands.mjs
-- (see README.md "Database setup" section for the full order)
-- ============================================================

-- ---------- Extensions ----------

create extension if not exists pg_net with schema extensions;

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'dealer', 'admin')),
  is_banned boolean not null default false,
  avatar_url text,
  city text,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  city text,
  phone text,
  is_verified boolean not null default false,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid (),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  title text not null,
  make text not null,
  model text not null,
  year int not null,
  mileage int not null default 0,
  price int not null,
  fuel_type text not null default 'petrol' check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric')),
  transmission text not null default 'automatic' check (transmission in ('automatic', 'manual')),
  condition text not null default 'used' check (condition in ('new', 'used')),
  color text,
  city text,
  description text,
  phone text,
  photos text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  -- Israeli-specific fields
  license_plate text,
  ownership_hand int, -- 1, 2, 3 (3 = 3rd hand or more)
  test_expiry date,
  accident_status text check (accident_status in ('none', 'minor', 'major')),
  -- engagement / monetization
  view_count int not null default 0,
  is_featured boolean not null default false,
  featured_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

-- Short store videos (≤60s, TikTok-style feed)
create table public.videos (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  url text not null,
  caption text,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.video_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- Israeli cities, grouped into areas, with coordinates for distance sorting.
create table public.cities (
  id uuid primary key default gen_random_uuid (),
  name_he text not null unique,
  name_ar text not null default '',
  area text not null default 'מרכז',
  sort int not null default 0,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now()
);

-- Vehicle manufacturer catalogue (real logos, admin-managed).
create table public.brands (
  id uuid primary key default gen_random_uuid (),
  name text not null unique,
  logo_url text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.store_reviews (
  id uuid primary key default gen_random_uuid (),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text,
  created_at timestamptz not null default now()
);

create index vehicles_status_created_idx on public.vehicles (status, created_at desc);
create index vehicles_store_idx on public.vehicles (store_id);
create index vehicles_seller_idx on public.vehicles (seller_id);
create index videos_store_idx on public.videos (store_id);
create index videos_created_idx on public.videos (created_at desc);

-- ---------- Helper: is the current user an admin? ----------

create or replace function public.is_admin ()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Auto-create profile on signup (everyone starts as customer) ----------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'city', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- ---------- Become a dealer: opens a store + upgrades role, one call ----------

create or replace function public.become_dealer (
  p_store_name text,
  p_city text default '',
  p_phone text default '',
  p_description text default ''
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_store_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from profiles where id = v_user and is_banned) then
    raise exception 'Account suspended';
  end if;
  if exists (select 1 from stores where owner_id = v_user) then
    raise exception 'Store already exists';
  end if;
  if coalesce(trim(p_store_name), '') = '' then
    raise exception 'Store name is required';
  end if;

  insert into stores (owner_id, name, city, phone, description)
  values (
    v_user,
    trim(p_store_name),
    nullif(trim(p_city), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_description), '')
  )
  returning id into v_store_id;

  update profiles set role = 'dealer' where id = v_user and role = 'customer';

  return v_store_id;
end;
$$;

-- ---------- Protect role / ban fields on profiles ----------

create or replace function public.protect_profile_fields ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- server-context updates (e.g. via management API) are trusted
  end if;
  if not public.is_admin() then
    if new.is_banned is distinct from old.is_banned then
      raise exception 'Only admins can change ban status';
    end if;
    -- the only self-service role change is customer → dealer (via become_dealer)
    if new.role is distinct from old.role
       and not (old.role = 'customer' and new.role = 'dealer') then
      raise exception 'Only admins can change roles';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields ();

-- ---------- Protect stores.is_verified / rating_avg / rating_count ----------
-- Prevents a store owner from self-servicing these via a raw UPDATE call.
-- The bypass flag lets the rating-sync trigger below write on behalf of
-- non-admin reviewers.

create or replace function public.protect_store_fields ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if current_setting('app.bypass_store_protect', true) = 'true' then
    return new;
  end if;
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified
       or new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count then
      raise exception 'Only admins can change verification or rating fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_store_fields
  before update on public.stores
  for each row execute function public.protect_store_fields ();

-- ---------- Protect vehicles.is_featured / featured_until / view_count ----------
-- Prevents a seller from self-featuring their own listing or inflating
-- their own view count via a raw UPDATE call. Bypassed by the
-- increment_vehicle_view RPC below for legitimate view counting.

create or replace function public.protect_vehicle_fields ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if current_setting('app.bypass_vehicle_protect', true) = 'true' then
    return new;
  end if;
  if not public.is_admin() then
    if new.is_featured is distinct from old.is_featured
       or new.featured_until is distinct from old.featured_until
       or new.view_count is distinct from old.view_count then
      raise exception 'Only admins can change featured status or view count';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_vehicle_fields
  before update on public.vehicles
  for each row execute function public.protect_vehicle_fields ();

-- ---------- View counter (bypasses the guard above) ----------

create or replace function public.increment_vehicle_view (p_vehicle_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_vehicle_protect', 'true', true);
  update vehicles set view_count = view_count + 1 where id = p_vehicle_id;
  perform set_config('app.bypass_vehicle_protect', 'false', true);
end;
$$;

-- ---------- Keep videos.like_count in sync ----------

create or replace function public.sync_video_likes ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update videos set like_count = like_count + 1 where id = new.video_id;
    return new;
  elsif tg_op = 'DELETE' then
    update videos set like_count = greatest(like_count - 1, 0) where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger video_likes_sync
  after insert or delete on public.video_likes
  for each row execute function public.sync_video_likes ();

-- ---------- Keep stores.rating_avg / rating_count in sync ----------

create or replace function public.sync_store_rating ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_store_id uuid := coalesce(new.store_id, old.store_id);
begin
  perform set_config('app.bypass_store_protect', 'true', true);
  update stores s set
    rating_count = sub.cnt,
    rating_avg = coalesce(sub.avg_rating, 0)
  from (
    select count(*) cnt, avg(rating)::numeric(2,1) avg_rating
    from store_reviews where store_id = v_store_id
  ) sub
  where s.id = v_store_id;
  perform set_config('app.bypass_store_protect', 'false', true);
  return coalesce(new, old);
end;
$$;

create trigger store_reviews_sync
  after insert or update or delete on public.store_reviews
  for each row execute function public.sync_store_rating ();

-- ---------- Push notifications: pg_net → Expo Push API ----------
-- No custom push server needed — Postgres calls Expo's push endpoint
-- directly via the pg_net extension.

create or replace function public.send_push (p_tokens text[], p_title text, p_body text, p_data jsonb default '{}')
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_messages jsonb;
begin
  if p_tokens is null or array_length(p_tokens, 1) is null then
    return;
  end if;
  select jsonb_agg(jsonb_build_object('to', t, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default'))
  into v_messages
  from unnest(p_tokens) t;

  perform extensions.net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_messages
  );
end;
$$;

-- notify saved-search owners when a matching active vehicle is published
create or replace function public.notify_saved_searches ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_tokens text[];
begin
  if new.status <> 'active' then
    return new;
  end if;

  select array_agg(distinct pt.token) into v_tokens
  from saved_searches ss
  join push_tokens pt on pt.user_id = ss.user_id
  where
    (ss.filters->>'search' is null or ss.filters->>'search' = '' or
      new.title ilike '%' || (ss.filters->>'search') || '%' or
      new.make ilike '%' || (ss.filters->>'search') || '%' or
      new.model ilike '%' || (ss.filters->>'search') || '%')
    and (ss.filters->>'maxPrice' is null or new.price <= (ss.filters->>'maxPrice')::int)
    and (ss.filters->>'minYear' is null or new.year >= (ss.filters->>'minYear')::int)
    and (ss.filters->>'transmission' is null or new.transmission = (ss.filters->>'transmission'))
    and (ss.filters->>'fuelType' is null or new.fuel_type = (ss.filters->>'fuelType'))
    and (ss.filters->>'city' is null or new.city = (ss.filters->>'city'))
    and ss.user_id <> new.seller_id;

  perform public.send_push(v_tokens, 'רכב חדש תואם לחיפוש שלך 🚗', new.title);
  return new;
end;
$$;

create trigger vehicles_notify_saved_searches
  after insert on public.vehicles
  for each row execute function public.notify_saved_searches ();

-- notify seller when admin removes their listing
create or replace function public.notify_listing_removed ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_tokens text[];
begin
  if new.status = 'removed' and old.status <> 'removed' then
    select array_agg(token) into v_tokens from push_tokens where user_id = new.seller_id;
    perform public.send_push(v_tokens, 'המודעה שלך הוסרה', new.title);
  end if;
  return new;
end;
$$;

create trigger vehicles_notify_removed
  after update on public.vehicles
  for each row execute function public.notify_listing_removed ();

-- notify seller when someone favorites their car
create or replace function public.notify_new_favorite ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
  v_tokens text[];
begin
  select seller_id, title into v_seller, v_title from vehicles where id = new.vehicle_id;
  if v_seller is null or v_seller = new.user_id then
    return new;
  end if;
  select array_agg(token) into v_tokens from push_tokens where user_id = v_seller;
  perform public.send_push(v_tokens, 'מישהו שמר את הרכב שלך ❤️', v_title);
  return new;
end;
$$;

create trigger favorites_notify_seller
  after insert on public.favorites
  for each row execute function public.notify_new_favorite ();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.vehicles enable row level security;
alter table public.favorites enable row level security;
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.cities enable row level security;
alter table public.brands enable row level security;
alter table public.store_reviews enable row level security;
alter table public.saved_searches enable row level security;
alter table public.push_tokens enable row level security;

create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

create policy "profiles update own or admin" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "stores readable" on public.stores
  for select to authenticated using (true);

create policy "stores update own or admin" on public.stores
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin());

create policy "stores delete admin" on public.stores
  for delete to authenticated
  using (public.is_admin());

create policy "vehicles readable" on public.vehicles
  for select to authenticated
  using (status = 'active' or seller_id = auth.uid() or public.is_admin());

create policy "vehicles insert own" on public.vehicles
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );

create policy "vehicles update own or admin" on public.vehicles
  for update to authenticated
  using (seller_id = auth.uid() or public.is_admin());

create policy "vehicles delete own or admin" on public.vehicles
  for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

create policy "favorites all own" on public.favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "videos readable" on public.videos
  for select to authenticated using (true);

create policy "videos insert store owner" on public.videos
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from stores where id = store_id and owner_id = auth.uid())
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );

create policy "videos delete own or admin" on public.videos
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "video likes all own" on public.video_likes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cities readable" on public.cities
  for select to authenticated using (true);

create policy "cities admin write" on public.cities
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "brands readable" on public.brands
  for select to authenticated using (true);

create policy "brands admin write" on public.brands
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "store_reviews readable" on public.store_reviews
  for select to authenticated using (true);

create policy "store_reviews own write" on public.store_reviews
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "store_reviews own update" on public.store_reviews
  for update to authenticated
  using (user_id = auth.uid());

create policy "store_reviews own delete" on public.store_reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "saved_searches all own" on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push_tokens all own" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Storage buckets: photos, videos, avatars, brand logos ----------

insert into storage.buckets (id, name, public)
values
  ('vehicle-photos', 'vehicle-photos', true),
  ('videos', 'videos', true),
  ('avatars', 'avatars', true),
  ('brands', 'brands', true);

create policy "media public read" on storage.objects
  for select using (bucket_id in ('vehicle-photos', 'videos', 'avatars', 'brands'));

create policy "media auth upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('vehicle-photos', 'videos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('vehicle-photos', 'videos', 'avatars') and owner = auth.uid());

create policy "brand logos admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brands' and public.is_admin());

create policy "brand logos admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brands' and public.is_admin());

-- ---------- Lock down internal/trigger-only functions ----------
-- These should only ever run as triggers or from inside another
-- SECURITY DEFINER function — never called directly via PostgREST's
-- /rpc/ endpoint by a client.

revoke execute on function public.send_push(text[], text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_saved_searches() from public, anon, authenticated;
revoke execute on function public.notify_listing_removed() from public, anon, authenticated;
revoke execute on function public.notify_new_favorite() from public, anon, authenticated;
revoke execute on function public.sync_store_rating() from public, anon, authenticated;
revoke execute on function public.sync_video_likes() from public, anon, authenticated;
revoke execute on function public.protect_store_fields() from public, anon, authenticated;
revoke execute on function public.protect_vehicle_fields() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

-- ============================================================
-- DONE with the base schema. Next steps:
--   0. Run migrations/002_dal_parity.sql — notification centre, store
--      hours/coords, banners, video moderation, legal pages, reports.
--      (This file is the v3 base; 002 layers the newer features on top.)
--   1. Run seed-cities.sql (80 Israeli cities with coordinates)
--   2. Run `node supabase/seed-brands.mjs` (uploads the 32 real
--      brand logos from assets/brands and inserts the rows)
--   3. Deploy the Edge Function in supabase/functions/admin-reset-password
--      (see README.md — needed for the "forgot password" admin flow)
--   4. Sign up in the app, then make yourself ADMIN:
--
--        update public.profiles set role = 'admin'
--        where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
--
--      (Remember: this app uses phone-based login, so the "email" is a
--      synthetic address — see phoneToEmail() in context/AuthContext.tsx.
--      For phone 0501234567 the email is 0501234567@phone.autohub.app)
-- ============================================================
