-- ============================================================================
-- 施設予約システム React版（fable-projects）Phase2 増分スキーマ
--
-- 対象   : Supabase (PostgreSQL)
-- 適用   : schema.sql 適用済みのプロジェクトに対して、Supabase Dashboard →
--          SQL Editor で本ファイル全体を貼り付けて実行（増分適用）
-- 出典   : React/documents/02_DB設計書_v1.0.md §3.2（Phase2テーブル）
--          ※ RLS・インデックス・トリガーは DB設計書に Phase2 分の定義がないため
--            Phase1 の方針（§4）に揃えて補完した（補正。各所のコメントと README 参照）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. テーブル定義（DB設計書 §3.2）
-- ----------------------------------------------------------------------------

-- 1.1 facility_prices（施設料金）: 施設ごとの時間単価
create table public.facility_prices (
  id             serial primary key,
  facility_id    integer not null unique references public.facilities (id) on delete cascade,
  price_per_unit integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 1.2 reservation_prices（予約料金）: 予約確定時点の合計金額を記録
create table public.reservation_prices (
  id             serial primary key,
  reservation_id integer not null unique references public.reservations (id) on delete cascade,
  subtotal       integer not null default 0,
  created_at     timestamptz not null default now()
);

-- 1.3 items（備品）
create table public.items (
  id             serial primary key,
  name           text not null,
  total_quantity integer not null default 1,
  rental_price   integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 1.4 reservation_items（予約備品）: rental_price は貸出時点の単価を記録
create table public.reservation_items (
  id             serial primary key,
  reservation_id integer not null references public.reservations (id) on delete cascade,
  item_id        integer not null references public.items (id) on delete restrict,
  quantity       integer not null default 1,
  rental_price   integer not null default 0,
  created_at     timestamptz not null default now()
);

-- 1.5 inquiries（問い合わせスレッド）
create table public.inquiries (
  id         serial primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  subject    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.6 inquiry_messages（問い合わせメッセージ）
create table public.inquiry_messages (
  id          serial primary key,
  inquiry_id  integer not null references public.inquiries (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  message     text not null,
  created_at  timestamptz not null default now()
);

-- 補正: DB設計書に Phase2 のインデックス定義がないため、FK 検索用を追加
-- （命名規則は §6.1 の idx_テーブル名_カラム名 に従う）
create index idx_reservation_items_reservation_id on public.reservation_items (reservation_id);
create index idx_reservation_items_item_id on public.reservation_items (item_id);
create index idx_inquiries_user_id on public.inquiries (user_id);
create index idx_inquiry_messages_inquiry_id on public.inquiry_messages (inquiry_id);

-- ----------------------------------------------------------------------------
-- 2. updated_at 自動更新トリガー（schema.sql の set_updated_at を再利用）
-- ----------------------------------------------------------------------------

create trigger trg_facility_prices_updated_at
  before update on public.facility_prices
  for each row execute function public.set_updated_at();

create trigger trg_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create trigger trg_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- 補正: メッセージ追加時に親スレッドの updated_at を進める
-- （A-07 一覧を「最終更新順」で並べるため。RLS を回避するため SECURITY DEFINER）
create or replace function public.bump_inquiry_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inquiries set updated_at = now() where id = new.inquiry_id;
  return new;
end;
$$;

create trigger trg_inquiry_messages_bump_parent
  after insert on public.inquiry_messages
  for each row execute function public.bump_inquiry_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS（Row Level Security）ポリシー
--    DB設計書 §4 は Phase1 テーブルのみのため、同じ方針で補完:
--      - 参照は authenticated に限定（未ログイン読み取りを遮断）
--      - マスタ（料金・備品）の更新系は admin/developer のみ
--      - 予約に紐づく行は「自分の予約」または admin のみ操作可
--      - 問い合わせは本人と admin のみ参照可（他人の問い合わせは見えない）
-- ----------------------------------------------------------------------------

alter table public.facility_prices enable row level security;
alter table public.reservation_prices enable row level security;
alter table public.items enable row level security;
alter table public.reservation_items enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_messages enable row level security;

-- 3.1 facility_prices
create policy facility_prices_select_all on public.facility_prices
  for select to authenticated using (true);
create policy facility_prices_insert_admin on public.facility_prices
  for insert to authenticated with check (public.is_admin());
create policy facility_prices_update_admin on public.facility_prices
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy facility_prices_delete_admin on public.facility_prices
  for delete to authenticated using (public.is_admin());

-- 3.2 reservation_prices（自分の予約の料金は作成・更新可。延長時の再計算にも使う）
create policy reservation_prices_select_all on public.reservation_prices
  for select to authenticated using (true);
create policy reservation_prices_insert_own on public.reservation_prices
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = (select auth.uid())
    )
  );
create policy reservation_prices_update_own on public.reservation_prices
  for update to authenticated using (
    public.is_admin() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = (select auth.uid())
    )
  );
create policy reservation_prices_delete_admin on public.reservation_prices
  for delete to authenticated using (public.is_admin());

-- 3.3 items
create policy items_select_all on public.items
  for select to authenticated using (true);
create policy items_insert_admin on public.items
  for insert to authenticated with check (public.is_admin());
create policy items_update_admin on public.items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy items_delete_admin on public.items
  for delete to authenticated using (public.is_admin());

-- 3.4 reservation_items（自分の予約に対してのみ追加・削除可）
create policy reservation_items_select_all on public.reservation_items
  for select to authenticated using (true);
create policy reservation_items_insert_own on public.reservation_items
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = (select auth.uid())
    )
  );
create policy reservation_items_delete_own on public.reservation_items
  for delete to authenticated using (
    public.is_admin() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = (select auth.uid())
    )
  );

-- 3.5 inquiries（本人と admin のみ。reservations と異なり全員参照にはしない）
create policy inquiries_select_own_or_admin on public.inquiries
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_admin()
  );
create policy inquiries_insert_own on public.inquiries
  for insert to authenticated with check (user_id = (select auth.uid()));

-- 3.6 inquiry_messages（スレッド所有者と admin のみ参照。送信者種別を強制）
create policy inquiry_messages_select_own_or_admin on public.inquiry_messages
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id and i.user_id = (select auth.uid())
    )
  );
create policy inquiry_messages_insert_own on public.inquiry_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and (
      -- 一般ユーザー: 自分のスレッドに sender_type='user' でのみ投稿可
      (sender_type = 'user' and exists (
        select 1 from public.inquiries i
        where i.id = inquiry_id and i.user_id = (select auth.uid())
      ))
      -- 管理者: 任意のスレッドに sender_type='admin' でのみ投稿可
      or (sender_type = 'admin' and public.is_admin())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. profiles への admin 用 UPDATE ポリシー（A-05 ユーザー管理用の補正）
--    - admin は他ユーザーの role を user/admin にのみ変更できる
--    - developer の行は変更不可（画面設計書 §4.12「developerはここからは設定不可」）
--    - developer への昇格も不可（with check で遮断）
--    既知の制約: RLS は列単位の制限ができないため、このポリシーは role 以外の列の
--    更新も許してしまう。UI では role 変更のみを発行する。
-- ----------------------------------------------------------------------------

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin() and role <> 'developer')
  with check (public.is_admin() and role in ('user', 'admin'));
