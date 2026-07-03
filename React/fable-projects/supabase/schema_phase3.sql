-- ============================================================================
-- 施設予約システム React版（fable-projects）Phase3 増分スキーマ（マルチテナント）
--
-- 対象   : Supabase (PostgreSQL)
-- 適用   : schema.sql / schema_phase2.sql 適用済みのプロジェクトに対して実行
-- 出典   : React/documents/02_DB設計書_v1.0.md §3.3（tenants）・§6.3（tenant_id）
--
-- 設計（TENANT-01〜04。詳細は README 参照）:
--   - tenant_id が NULL の行は「共有（未割当）」で、全テナントから見える。
--     既存データは NULL のまま残るため、適用後にテナントへ割り当てる
--   - 行作成時は作成者の所属テナントを自動で引き継ぐ（BEFORE INSERT トリガー）
--   - SELECT/更新系の RLS に「共有 or 自テナント or developer」を追加して分離する
--   - developer は全テナントの行を閲覧できる（運用管理のため）。
--     developer の「テナント切り替え」（TENANT-02）は、新規作成する行の
--     割当先テナントを変える操作として機能する
--   - module_settings のテナント別設定（TENANT-03 の一部）は未対応（既知の制約）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. tenants テーブル（DB設計書 §3.3.1）
-- ----------------------------------------------------------------------------

create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subdomain  text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;

-- テナント名は画面表示（割当セレクト等）で必要なため authenticated に公開
create policy tenants_select_all on public.tenants
  for select to authenticated using (true);
create policy tenants_insert_developer on public.tenants
  for insert to authenticated with check (public.is_developer());
create policy tenants_update_developer on public.tenants
  for update to authenticated using (public.is_developer()) with check (public.is_developer());
create policy tenants_delete_developer on public.tenants
  for delete to authenticated using (public.is_developer());

-- ----------------------------------------------------------------------------
-- 2. tenant_id カラムの追加（DB設計書 §6.3 の対象テーブル）
--    削除時は SET NULL（テナント削除でデータは共有に戻る。物理削除しない）
-- ----------------------------------------------------------------------------

alter table public.profiles     add column tenant_id uuid references public.tenants (id) on delete set null;
alter table public.categories   add column tenant_id uuid references public.tenants (id) on delete set null;
alter table public.facilities   add column tenant_id uuid references public.tenants (id) on delete set null;
alter table public.reservations add column tenant_id uuid references public.tenants (id) on delete set null;
alter table public.items        add column tenant_id uuid references public.tenants (id) on delete set null;
alter table public.inquiries    add column tenant_id uuid references public.tenants (id) on delete set null;

create index idx_profiles_tenant_id on public.profiles (tenant_id);
create index idx_categories_tenant_id on public.categories (tenant_id);
create index idx_facilities_tenant_id on public.facilities (tenant_id);
create index idx_reservations_tenant_id on public.reservations (tenant_id);
create index idx_items_tenant_id on public.items (tenant_id);
create index idx_inquiries_tenant_id on public.inquiries (tenant_id);

-- ----------------------------------------------------------------------------
-- 3. ヘルパー関数と自動割当トリガー
-- ----------------------------------------------------------------------------

-- ログインユーザーの所属テナント（未割当は NULL）。
-- current_user_role() と同様、RLS の再帰評価を避けるため SECURITY DEFINER
create or replace function public.current_user_tenant()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- 行作成時に作成者の所属テナントを自動で引き継ぐ（アプリ側の変更不要で分離が効く）
create or replace function public.set_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_user_tenant();
  end if;
  return new;
end;
$$;

create trigger trg_categories_tenant   before insert on public.categories   for each row execute function public.set_tenant_id();
create trigger trg_facilities_tenant   before insert on public.facilities   for each row execute function public.set_tenant_id();
create trigger trg_reservations_tenant before insert on public.reservations for each row execute function public.set_tenant_id();
create trigger trg_items_tenant        before insert on public.items        for each row execute function public.set_tenant_id();
create trigger trg_inquiries_tenant    before insert on public.inquiries    for each row execute function public.set_tenant_id();
-- profiles は handle_new_user で作成されるため対象外（登録直後は未割当）

-- ----------------------------------------------------------------------------
-- 4. RLS のテナント分離（TENANT-04）
--    「共有(NULL) or 自テナント or developer」の可視条件を SELECT に追加し、
--    マスタの更新系（admin）にも同じ条件を課す
-- ----------------------------------------------------------------------------

-- 可視条件の共通式
create or replace function public.tenant_visible(row_tenant uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select row_tenant is null
      or row_tenant = public.current_user_tenant()
      or public.is_developer()
$$;

-- 4.1 SELECT ポリシーの差し替え
drop policy profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated using (public.tenant_visible(tenant_id));

drop policy categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select to authenticated using (public.tenant_visible(tenant_id));

drop policy facilities_select_all on public.facilities;
create policy facilities_select_all on public.facilities
  for select to authenticated using (public.tenant_visible(tenant_id));

drop policy reservations_select_all on public.reservations;
create policy reservations_select_all on public.reservations
  for select to authenticated using (public.tenant_visible(tenant_id));

drop policy items_select_all on public.items;
create policy items_select_all on public.items
  for select to authenticated using (public.tenant_visible(tenant_id));

-- inquiries は元々「本人 or admin」のため、admin 側にテナント条件を追加
drop policy inquiries_select_own_or_admin on public.inquiries;
create policy inquiries_select_own_or_admin on public.inquiries
  for select to authenticated using (
    user_id = (select auth.uid())
    or (public.is_admin() and public.tenant_visible(tenant_id))
  );

-- 4.2 マスタ更新系（admin）にもテナント条件を追加
drop policy categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated
  using (public.is_admin() and public.tenant_visible(tenant_id))
  with check (public.is_admin());

drop policy categories_delete_admin on public.categories;
create policy categories_delete_admin on public.categories
  for delete to authenticated using (public.is_admin() and public.tenant_visible(tenant_id));

drop policy facilities_update_admin on public.facilities;
create policy facilities_update_admin on public.facilities
  for update to authenticated
  using (public.is_admin() and public.tenant_visible(tenant_id))
  with check (public.is_admin());

drop policy facilities_delete_admin on public.facilities;
create policy facilities_delete_admin on public.facilities
  for delete to authenticated using (public.is_admin() and public.tenant_visible(tenant_id));

drop policy items_update_admin on public.items;
create policy items_update_admin on public.items
  for update to authenticated
  using (public.is_admin() and public.tenant_visible(tenant_id))
  with check (public.is_admin());

drop policy items_delete_admin on public.items;
create policy items_delete_admin on public.items
  for delete to authenticated using (public.is_admin() and public.tenant_visible(tenant_id));

drop policy reservations_update_admin on public.reservations;
create policy reservations_update_admin on public.reservations
  for update to authenticated
  using (public.is_admin() and public.tenant_visible(tenant_id))
  with check (public.is_admin());

-- 4.3 profiles / inquiry_messages の admin 系ポリシーにもテナント条件を追加
--     （追加しないと API 直叩きで他テナントのユーザー・問い合わせを操作できる）
drop policy profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (
    public.is_admin() and role <> 'developer' and public.tenant_visible(tenant_id)
  )
  with check (public.is_admin() and role in ('user', 'admin'));

-- メッセージの可視・投稿可否は「親スレッドが見えるか」に委譲する。
-- サブクエリの inquiries には RLS（本人 or 自テナントの admin）が適用されるため、
-- admin のテナント越えアクセスも自動的に遮断される
drop policy inquiry_messages_select_own_or_admin on public.inquiry_messages;
create policy inquiry_messages_select_own_or_admin on public.inquiry_messages
  for select to authenticated using (
    exists (select 1 from public.inquiries i where i.id = inquiry_id)
  );

drop policy inquiry_messages_insert_own on public.inquiry_messages;
create policy inquiry_messages_insert_own on public.inquiry_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.inquiries i where i.id = inquiry_id)
    and (
      (sender_type = 'user' and exists (
        select 1 from public.inquiries i
        where i.id = inquiry_id and i.user_id = (select auth.uid())
      ))
      or (sender_type = 'admin' and public.is_admin())
    )
  );
