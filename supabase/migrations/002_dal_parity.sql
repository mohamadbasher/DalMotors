-- ============================================================
-- Migration 002 — features ported from the Dal marketplace app
--
-- Apply to an EXISTING database created from schema.sql v3.
-- (schema.sql has been updated to include all of this, so a FRESH
--  project does not need to run this file.)
--
-- Adds: in-app notification centre, store opening hours / open-closed
-- switch / exact coordinates, home banners, video moderation, admin-editable
-- legal pages, and listing reports.
-- ============================================================

-- ---------- 1. In-app notification centre ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- 2. Stores: hours, open/closed, exact coordinates ----------
alter table public.stores add column if not exists hours jsonb;
alter table public.stores add column if not exists is_open boolean not null default true;
alter table public.stores add column if not exists lat numeric(9,6);
alter table public.stores add column if not exists lng numeric(9,6);

-- ---------- 3. Home banners ----------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid (),
  image_url text not null,
  link text,
  is_active boolean not null default true,
  expires_at timestamptz,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 4. Video moderation ----------
-- Existing rows default to 'approved' so nothing already public disappears;
-- the app inserts new uploads with status = 'pending'.
alter table public.videos add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- ---------- 5. Admin-editable legal pages ----------
create table if not exists public.legal_pages (
  key text primary key,
  title_he text not null default '',
  title_ar text not null default '',
  title_ru text not null default '',
  body_he text not null default '',
  body_ar text not null default '',
  body_ru text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- 6. Reports (trust & safety) ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid (),
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------- RLS ----------
alter table public.notifications enable row level security;
alter table public.banners enable row level security;
alter table public.legal_pages enable row level security;
alter table public.reports enable row level security;

do $do$ begin
  create policy "notifications own read" on public.notifications for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "notifications own update" on public.notifications for update to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "notifications own delete" on public.notifications for delete to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $do$;

do $do$ begin
  create policy "banners readable" on public.banners for select to authenticated using (true);
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "banners admin write" on public.banners for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $do$;

do $do$ begin
  create policy "legal readable" on public.legal_pages for select to authenticated using (true);
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "legal admin write" on public.legal_pages for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $do$;

do $do$ begin
  create policy "reports insert own" on public.reports for insert to authenticated
    with check (reporter_id = auth.uid());
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "reports admin read" on public.reports for select to authenticated
    using (public.is_admin());
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "reports admin update" on public.reports for update to authenticated
    using (public.is_admin());
exception when duplicate_object then null; end $do$;

-- ---------- Banner image storage ----------
insert into storage.buckets (id, name, public) values ('banners','banners', true)
  on conflict (id) do nothing;
do $do$ begin
  create policy "banners public read" on storage.objects for select using (bucket_id = 'banners');
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "banners admin upload" on storage.objects for insert to authenticated
    with check (bucket_id = 'banners' and public.is_admin());
exception when duplicate_object then null; end $do$;
do $do$ begin
  create policy "banners admin delete" on storage.objects for delete to authenticated
    using (bucket_id = 'banners' and public.is_admin());
exception when duplicate_object then null; end $do$;

-- ---------- Only approved videos are publicly visible ----------
drop policy if exists "videos readable" on public.videos;
create policy "videos readable" on public.videos
  for select to authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

do $do$ begin
  create policy "videos update admin" on public.videos for update to authenticated
    using (public.is_admin());
exception when duplicate_object then null; end $do$;

-- ---------- Persist an in-app notification alongside every push ----------
create or replace function public.notify_user (
  p_user_id uuid, p_type text, p_title text, p_body text, p_payload jsonb default '{}'
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_tokens text[];
begin
  insert into notifications (user_id, type, title, body, payload)
  values (p_user_id, p_type, p_title, p_body, p_payload);

  select array_agg(token) into v_tokens from push_tokens where user_id = p_user_id;
  perform public.send_push(v_tokens, p_title, p_body, p_payload);
end;
$$;
revoke execute on function public.notify_user(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.notify_saved_searches ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status <> 'active' then
    return new;
  end if;
  for r in
    select distinct ss.user_id
    from saved_searches ss
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
      and ss.user_id <> new.seller_id
  loop
    perform public.notify_user(
      r.user_id, 'saved_search', 'רכב חדש תואם לחיפוש שלך 🚗', new.title,
      jsonb_build_object('vehicleId', new.id)
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_listing_removed ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'removed' and old.status <> 'removed' then
    perform public.notify_user(
      new.seller_id, 'listing_removed', 'המודעה שלך הוסרה', new.title,
      jsonb_build_object('vehicleId', new.id)
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_new_favorite ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
begin
  select seller_id, title into v_seller, v_title from vehicles where id = new.vehicle_id;
  if v_seller is null or v_seller = new.user_id then
    return new;
  end if;
  perform public.notify_user(
    v_seller, 'favorite', 'מישהו שמר את הרכב שלך ❤️', v_title,
    jsonb_build_object('vehicleId', new.vehicle_id)
  );
  return new;
end;
$$;

-- notify a dealer when their video is approved or rejected
create or replace function public.notify_video_reviewed ()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.notify_user(
      new.owner_id,
      'video_' || new.status,
      case when new.status = 'approved' then 'הסרטון שלך אושר 🎬' else 'הסרטון שלך נדחה' end,
      coalesce(new.caption, ''),
      jsonb_build_object('videoId', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists videos_notify_reviewed on public.videos;
create trigger videos_notify_reviewed
  after update on public.videos
  for each row execute function public.notify_video_reviewed ();

revoke execute on function public.notify_video_reviewed() from public, anon, authenticated;

-- ---------- Seed the legal pages with the app's built-in copy ----------
insert into public.legal_pages (key, title_he, title_ar, title_ru, body_he, body_ar, body_ru) values
('terms',
 'תנאי שימוש','شروط الاستخدام','Условия использования',
 E'ברוכים הבאים לאפליקציה. השימוש באפליקציה מהווה הסכמה לתנאים אלה.\n\n1. האפליקציה משמשת כפלטפורמה לפרסום רכבים למכירה בין משתמשים. איננו צד לעסקאות ואיננו אחראים לטיב הרכבים, למצבם או לנכונות הפרטים במודעות.\n\n2. האחריות המלאה על נכונות פרטי המודעה, התמונות והסרטונים חלה על המפרסם בלבד.\n\n3. חל איסור לפרסם תוכן פוגעני, מטעה או בלתי חוקי. הנהלת האפליקציה רשאית להסיר מודעות ולחסום משתמשים לפי שיקול דעתה.\n\n4. מומלץ לבדוק כל רכב במכון בדיקה מורשה לפני רכישה ולוודא בעלות ושעבודים.',
 E'أهلاً بكم في التطبيق. استخدام التطبيق يعني الموافقة على هذه الشروط.\n\n1. التطبيق منصة لنشر مركبات للبيع بين المستخدمين. لسنا طرفاً في الصفقات ولسنا مسؤولين عن حالة المركبات أو صحة تفاصيل الإعلانات.\n\n2. المسؤولية الكاملة عن صحة تفاصيل الإعلان والصور والفيديوهات تقع على المعلن وحده.\n\n3. يُمنع نشر محتوى مسيء أو مضلّل أو غير قانوني. يحق لإدارة التطبيق إزالة إعلانات وحظر مستخدمين حسب تقديرها.\n\n4. ننصح بفحص أي مركبة في مركز فحص مرخّص قبل الشراء والتأكد من الملكية والرهونات.',
 E'Добро пожаловать в приложение. Использование приложения означает согласие с настоящими условиями.\n\n1. Приложение служит платформой для размещения объявлений о продаже автомобилей между пользователями. Мы не являемся стороной сделок и не несём ответственности за состояние автомобилей или достоверность данных в объявлениях.\n\n2. Полная ответственность за достоверность данных объявления, фотографий и видео лежит на разместившем их пользователе.\n\n3. Запрещено размещать оскорбительный, вводящий в заблуждение или незаконный контент. Администрация вправе удалять объявления и блокировать пользователей.\n\n4. Рекомендуется проверить автомобиль в лицензированном центре техосмотра перед покупкой.'),
('privacy',
 'מדיניות פרטיות','سياسة الخصوصية','Политика конфиденциальности',
 E'אנו מכבדים את פרטיות המשתמשים שלנו.\n\n1. אנו אוספים את הפרטים שנמסרים בהרשמה (שם, טלפון) ואת תוכן המודעות שאתם מפרסמים.\n\n2. פרטי הקשר שלכם מוצגים במודעות שאתם בוחרים לפרסם, כדי שקונים יוכלו ליצור קשר.\n\n3. איננו מוכרים את המידע שלכם לצדדים שלישיים.\n\n4. ניתן לבקש מחיקת חשבון ומידע בכל עת דרך "צרו קשר".',
 E'نحن نحترم خصوصية مستخدمينا.\n\n1. نجمع البيانات المقدّمة عند التسجيل (الاسم، الهاتف) ومحتوى الإعلانات التي تنشرونها.\n\n2. تظهر بيانات الاتصال في الإعلانات التي تختارون نشرها ليتمكن المشترون من التواصل.\n\n3. لا نبيع معلوماتكم لأطراف ثالثة.\n\n4. يمكن طلب حذف الحساب والبيانات في أي وقت عبر "تواصلوا معنا".',
 E'Мы уважаем конфиденциальность наших пользователей.\n\n1. Мы собираем данные, предоставленные при регистрации (имя, телефон), и содержимое ваших объявлений.\n\n2. Ваши контактные данные отображаются в объявлениях, которые вы публикуете, чтобы покупатели могли связаться с вами.\n\n3. Мы не продаём вашу информацию третьим лицам.\n\n4. Вы можете запросить удаление аккаунта в любое время через «Связаться с нами».'),
('about',
 'אודות האפליקציה','حول التطبيق','О приложении',
 E'זירת הרכב החדשה — קונים ומוכרים רכבים בקלות, מאנשים פרטיים ומסוחרים מורשים.\n\n🚗 לפרסם רכב למכירה בחינם תוך דקה\n🏪 לפתוח חנות רכב ולנהל מלאי וסרטונים\n🎬 לצפות בסרטוני רכבים קצרים\n❤️ לשמור מועדפים וליצור קשר ישיר בטלפון או בוואטסאפ',
 E'ساحة المركبات الجديدة — بيع وشراء مركبات بسهولة، من أفراد وتجّار مرخّصين.\n\n🚗 انشر مركبة للبيع مجاناً خلال دقيقة\n🏪 افتح متجر مركبات وأدر المخزون والفيديوهات\n🎬 شاهد فيديوهات مركبات قصيرة\n❤️ احفظ المفضلة وتواصل مباشرة بالهاتف أو الواتساب',
 E'Новая площадка для автомобилей — покупайте и продавайте легко, от частных лиц и лицензированных дилеров.\n\n🚗 Разместите авто бесплатно за минуту\n🏪 Откройте автомагазин и управляйте складом и видео\n🎬 Смотрите короткие видео об автомобилях\n❤️ Сохраняйте избранное и связывайтесь напрямую')
on conflict (key) do nothing;
