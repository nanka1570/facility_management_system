-- ============================================================================
-- 施設予約システム React版（fable-projects）データベーススキーマ
--
-- 対象   : Supabase (PostgreSQL)
-- 適用   : Supabase Dashboard → SQL Editor で本ファイル全体を貼り付けて実行
-- 前提   : 新規プロジェクト（同名のテーブル・関数が存在しないこと）
-- 出典   : React/documents/02_DB設計書_v1.0.md
--          ※ 一部、設計書からの意図的な補正あり（各所のコメントと README 参照）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. テーブル定義（DB設計書 §3.1）
-- ----------------------------------------------------------------------------

-- 1.1 profiles（ユーザー情報）: auth.users と 1:1
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  display_name text,
  role        text not null default 'user'
              check (role in ('user', 'admin', 'developer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.2 categories（カテゴリ）
create table public.categories (
  id         serial primary key,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_categories_sort_order on public.categories (sort_order);

-- 1.3 facilities（施設）
create table public.facilities (
  id              serial primary key,
  category_id     integer references public.categories (id) on delete set null,
  name            text not null,
  max_capacity    integer not null default 1,
  equipment       text,
  time_unit       integer not null default 30,
  allow_extension boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_facilities_category_id on public.facilities (category_id);
create index idx_facilities_is_active on public.facilities (is_active);

-- 1.4 reservations（予約）
create table public.reservations (
  id          serial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  facility_id integer not null references public.facilities (id) on delete cascade,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  num_people  integer not null default 1,
  purpose     text,
  status      text not null default 'confirmed'
              check (status in ('confirmed', 'cancelled', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index idx_reservations_user_id on public.reservations (user_id);
create index idx_reservations_facility_id on public.reservations (facility_id);
create index idx_reservations_start_time on public.reservations (start_time);
create index idx_reservations_status on public.reservations (status);

-- 1.5 module_settings（モジュール設定）
create table public.module_settings (
  id         serial primary key,
  module_id  text not null unique,
  is_enabled boolean not null default false,
  config     jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. updated_at 自動更新トリガー
--    対象は updated_at を持つ4テーブル（categories は updated_at なしのため除外）
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_facilities_updated_at
  before update on public.facilities
  for each row execute function public.set_updated_at();

create trigger trg_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

create trigger trg_module_settings_updated_at
  before update on public.module_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. 新規ユーザー登録時に profiles へ自動挿入（DB設計書 §5.1）
--    補正: SECURITY DEFINER 関数に search_path を固定（Supabase lint 推奨）
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. 権限判定ヘルパー関数
--    SECURITY DEFINER で profiles を参照することで RLS の再帰評価を回避する
-- ----------------------------------------------------------------------------

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() in ('admin', 'developer')
$$;

create or replace function public.is_developer()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'developer'
$$;

-- ----------------------------------------------------------------------------
-- 5. RLS（Row Level Security）ポリシー（DB設計書 §4）
--    補正1: SELECT 系の「全員閲覧可」は authenticated（ログイン済み全員）に限定
--            （未ログインの anon キーで profiles の全メールアドレス等が読めるのを防ぐ）
--    補正2: reservations_update_admin を追加
--            （A-04 予約管理で管理者が他人の予約を編集・キャンセル・復元するために必須）
--    補正3: profiles_update_own の with check で role の自己変更を禁止
--            （一般ユーザーが API 直叩きで自分を admin に昇格できる穴を塞ぐ）
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.facilities enable row level security;
alter table public.reservations enable row level security;
alter table public.module_settings enable row level security;

-- 5.1 profiles
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_user_role());

-- 5.2 categories
create policy categories_select_all on public.categories
  for select to authenticated using (true);

create policy categories_insert_admin on public.categories
  for insert to authenticated with check (public.is_admin());

create policy categories_update_admin on public.categories
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy categories_delete_admin on public.categories
  for delete to authenticated using (public.is_admin());

-- 5.3 facilities
create policy facilities_select_all on public.facilities
  for select to authenticated using (true);

create policy facilities_insert_admin on public.facilities
  for insert to authenticated with check (public.is_admin());

create policy facilities_update_admin on public.facilities
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy facilities_delete_admin on public.facilities
  for delete to authenticated using (public.is_admin());

-- 5.4 reservations
create policy reservations_select_all on public.reservations
  for select to authenticated using (true);

create policy reservations_insert_own on public.reservations
  for insert to authenticated with check (auth.uid() = user_id);

create policy reservations_update_own on public.reservations
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reservations_delete_own on public.reservations
  for delete to authenticated using (auth.uid() = user_id);

create policy reservations_update_admin on public.reservations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5.5 module_settings
create policy module_settings_select_all on public.module_settings
  for select to authenticated using (true);

create policy module_settings_update_developer on public.module_settings
  for update to authenticated
  using (public.is_developer()) with check (public.is_developer());

-- ----------------------------------------------------------------------------
-- 6. 初期データ: module_settings（12モジュール）
--    DB設計書 §3.1.5 は11行だが、要件定義書 v2.3 §3.1 と画面設計書 A-08 に
--    M-THEME が含まれるため12行とする（設計書間の不整合は README 参照）
-- ----------------------------------------------------------------------------

insert into public.module_settings (module_id, is_enabled) values
  ('M-CORE',     true),
  ('M-USER',     true),
  ('M-FACILITY', true),
  ('M-RESERVE',  true),
  ('M-EXTEND',   false),
  ('M-DISPLAY',  false),
  ('M-PRICE',    false),
  ('M-ITEM',     false),
  ('M-INQUIRY',  false),
  ('M-NOTIFY',   false),
  ('M-THEME',    false),
  ('M-TENANT',   false);

-- ----------------------------------------------------------------------------
-- 7. サンプルデータ: カテゴリ3件 + 施設4件（画面設計書のワイヤーフレームに準拠）
--    予約のサンプルは投入しない（user_id がサインアップ後にしか存在しないため）
-- ----------------------------------------------------------------------------

insert into public.categories (name, sort_order) values
  ('会議室',   1),
  ('スタジオ', 2),
  ('研修室',   3);

insert into public.facilities (category_id, name, max_capacity, equipment, time_unit) values
  (1, '会議室A',  10, 'プロジェクター、ホワイトボード', 30),
  (1, '会議室B',   8, 'ホワイトボード',                 30),
  (2, 'スタジオ', 20, '撮影機材、防音設備',             30),
  (3, '研修室',   30, 'プロジェクター、マイク',         30);

-- ----------------------------------------------------------------------------
-- 8.（任意）DB レベルの重複予約防止
--    アプリ層の重複チェックは同時送信のレースコンディションを理論上すり抜けうる。
--    確実に防ぎたい場合は以下のコメントを外して実行する（Phase1 では任意）。
-- ----------------------------------------------------------------------------

create extension if not exists btree_gist;

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    facility_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status = 'confirmed');
