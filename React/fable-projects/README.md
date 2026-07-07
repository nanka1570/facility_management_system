# 施設予約システム React版（fable-projects）

専門学校卒業制作の PHP 版「汎用施設管理システム」を、`React/documents/` の設計書3点（要件定義書 v2.3 / DB設計書 v1.0 / 画面設計書 v2.0）に従って Next.js でリライトしたものです。**Claude Code（Fable 5）が設計書のみを情報源として実装**しています（既存実装 `React/Projects/` は参照していません）。

実装スコープは **Phase1（コア機能）+ Phase2（拡張機能）+ Phase3（高度な機能）＝全フェーズ（完成形）** です。

> **このプロジェクトの位置づけ**: 学習ワークフローにおける**見本（完成形）**です。進め方は「①最初にユーザー自身が `React/Projects/`（自作版）を実装 → ②fableが本見本を実装 → ③見本と自作版の両方を fable が比較評価（`React/documents/04_比較評価レポート_v1.2.md`）→ ④差分を自分の手で自作版に反映」。見本のコードを自作版へコピーすることはしません（詳細はリポジトリルートの README 参照）。

## 技術スタック

| 層 | 技術 |
|----|------|
| フレームワーク | Next.js 16（App Router / Turbopack） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Supabase（PostgreSQL + Auth） |
| 追加パッケージ | `@supabase/supabase-js` / `@supabase/ssr` のみ |

## 画面一覧

| 画面ID | 画面名 | URL | 権限 | Phase |
|--------|--------|-----|------|-------|
| C-01 | ログイン / 新規登録 | `/` | 不要 | 1 |
| C-03 | パスワードリセット | `/reset-password`（+ `/update`） | 不要 | 2 |
| U-01 | ダッシュボード | `/dashboard` | ログイン済み | 1 |
| U-02 | 予約カレンダー（日別） | `/reservations` | ログイン済み | 1 |
| U-03 | 予約モーダル（新規/編集/閲覧 + 料金/備品/延長） | （モーダル） | ログイン済み | 1+2 |
| U-04 | マイページ | `/mypage` | ログイン済み | 1 |
| U-05 | 問い合わせ | `/inquiry` | ログイン済み・M-INQUIRY | 2 |
| U-06 | 時間延長申請 | （U-03内） | ログイン済み・M-EXTEND | 2 |
| A-01 | 管理者ダッシュボード | `/admin/dashboard` | admin 以上 | 1 |
| A-02 | 施設管理（+延長可否/料金） | `/admin/facilities` | admin 以上 | 1+2 |
| A-03 | カテゴリ管理 | `/admin/categories` | admin 以上 | 1 |
| A-04 | 予約管理 | `/admin/reservations` | admin 以上 | 1 |
| A-05 | ユーザー管理 | `/admin/users` | admin 以上 | 2 |
| A-06 | 備品管理 | `/admin/items` | admin 以上・M-ITEM | 2 |
| A-07 | 問い合わせ管理 | `/admin/inquiries` | admin 以上・M-INQUIRY | 2 |
| A-08 | モジュール設定 | `/admin/settings` | developer のみ | 1 |
| A-09 | テーマ設定 | `/admin/theme` | developer のみ・M-THEME | 2 |
| D-01 | サイネージ（全体） | `/display` | ログイン済み・M-DISPLAY | 2+3 |
| D-02 | サイネージ（施設別） | `/display/[id]` | ログイン済み・M-DISPLAY | 2+3 |
| - | テナント管理 | `/admin/tenants` | developer のみ・M-TENANT | 3 |

Phase3 の画面を伴わない機能: RES-08 CSVエクスポート（A-04内）、PRICE-03 料金履歴（U-04内）、ITEM-04 在庫管理（U-03の予約時チェック+A-06の貸出中表示）、INQ-05 チャット形式表示（U-05/A-07内）、THEME-04 フォント選択（A-09内）、DISP-05 表示項目カスタマイズ（A-08内）、NOTIF-01〜04 メール通知（Edge Function）。

## セットアップ手順

### 前提

- Node.js 22 以上 / npm

### 1. Supabase プロジェクトを作成する

1. [supabase.com](https://supabase.com) にサインインし、新規プロジェクトを作成する（リージョン: Northeast Asia (Tokyo) 推奨）
2. プロジェクトの起動完了を待つ

### 2. データベーススキーマを適用する

1. Supabase Dashboard → **SQL Editor** を開く
2. [`supabase/schema.sql`](./supabase/schema.sql) の内容を全て貼り付けて **Run** する
3. 続けて [`supabase/schema_phase2.sql`](./supabase/schema_phase2.sql) を貼り付けて **Run** する（Phase2 増分）
4. 続けて [`supabase/schema_phase3.sql`](./supabase/schema_phase3.sql) を貼り付けて **Run** する（Phase3 増分: マルチテナント）
5. **Table Editor** で以下を確認する
   - Phase1 テーブル5つ: `profiles` / `categories` / `facilities` / `reservations` / `module_settings`
   - Phase2 テーブル6つ: `facility_prices` / `reservation_prices` / `items` / `reservation_items` / `inquiries` / `inquiry_messages`
   - Phase3 テーブル: `tenants`（+ 主要テーブルに `tenant_id` 列）
   - `module_settings` に12行（M-CORE〜M-TENANT）
   - `categories` に3行、`facilities` に4行

#### （任意）メール通知（M-NOTIFY）を使う場合

[Resend](https://resend.com) の API キーを取得し、Edge Function をデプロイする:

```bash
supabase functions deploy send-notification
supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_FROM="施設管理システム <onboarding@resend.dev>"
```

リマインダー（NOTIF-02）は Dashboard → Edge Functions → Schedules で
`send-notification` を毎日1回、リクエストボディ `{"type":"reminder"}` で実行するよう設定する。
未デプロイでも他機能には影響しない（通知は静かにスキップされる）。

> Phase2 の各機能（延長・サイネージ・料金・備品・問い合わせ・テーマ）は、A-08 で対応モジュール（M-EXTEND / M-DISPLAY / M-PRICE / M-ITEM / M-INQUIRY / M-THEME）を ON にすると有効になります（初期値は OFF）。
>
> **ローカルスタック（`supabase start`）で動かす場合**: スキーマ適用後に [`supabase/grant_local.sql`](./supabase/grant_local.sql) も実行すること。クラウドと異なりデフォルト権限が付与されず、REST が permission denied になる（E2Eテストで発見。クラウドでは不要）。
> パスワードリセット（C-03）のメールリンク先は Dashboard → **Authentication → URL Configuration** の Redirect URLs に `http://localhost:3000/reset-password/update` を追加してください。

### 3.（推奨）メール確認を無効化する

デモ・学習用途では、Dashboard → **Authentication → Sign In / Up → Email** の **Confirm email** を OFF にすると、サインアップ直後にそのままログインできます。

> ON のままの場合: サインアップ後に届く確認メールのリンクを開いてから、ログインしてください。

### 4. 環境変数を設定する

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、Dashboard → **Project Settings → API** の値を設定する:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public キー（新形式の `sb_publishable_...` でも可）

### 5. 起動する

```bash
npm install
npm run dev
```

http://localhost:3000 でログイン画面（C-01）が表示されます。

### 6. ユーザーを作成して管理者に昇格する

1. 画面から新規登録（サインアップ）する → `profiles` に自動で行が作られる
2. SQL Editor で以下を実行し、自分を developer に昇格する

```sql
update public.profiles set role = 'developer' where email = '自分のメールアドレス';
```

> role は `user`（一般）/ `admin`（管理者）/ `developer`（開発者: モジュール設定可）の3種類です。

## 動作確認チェックリスト

### 認証・権限

- [ ] サインアップ → `profiles` に自動で行が作成される（トリガー確認）
- [ ] ログイン → `/dashboard` に遷移する
- [ ] 未ログインで `/dashboard` に直アクセス → `/` に戻される
- [ ] `role = 'user'` のまま `/admin/dashboard` に直アクセス → `/dashboard` に戻される
- [ ] developer 昇格後 → 管理画面一式が表示され `/admin/settings` に到達できる
- [ ] admin（developer でない）ユーザー → `/admin/settings` が `/admin/dashboard` に戻される
- [ ] ログアウト → `/` に戻る

### 予約フロー（U-02 / U-03）

- [ ] 空き枠クリック → 予約 → グリッドに即反映される
- [ ] 同一枠を別ユーザーで予約 → 重複アラートが出る
- [ ] 自分の予約の時間変更（同じ枠のまま更新）→ エラーにならない（自己除外の確認）
- [ ] 予約キャンセル → 枠が空きに戻る
- [ ] 境界接触（10:00-11:00 と 11:00-12:00）→ 両方予約できる
- [ ] 他人の予約をクリック → 閲覧のみ（編集不可）

### 管理画面

- [ ] A-04: 他ユーザーの予約を編集・キャンセル・復元できる（admin 用 RLS の確認）
- [ ] A-04: 重複が発生する復元 → 中止されアラートが出る
- [ ] A-02: 確定予約がある施設の削除 → 中止されアラートが出る
- [ ] A-03: 施設で使用中のカテゴリの削除 → 中止されアラートが出る
- [ ] A-08: M-RESERVE を OFF → ユーザー画面から予約導線が消え、`/reservations` 直アクセスがリダイレクトされる → ON で復帰

### レスポンシブ

- [ ] スマホ幅（767px以下）: U-02 が「施設選択 + リスト表示」に切り替わる
- [ ] スマホ幅: 管理画面サイドバーがハンバーガーメニューになる

### Phase2 機能（各モジュールを ON にして確認）

- [ ] C-03: リセットメール送信 → リンクから新パスワード設定 → 新パスワードでログインできる
- [ ] A-05: 一般ユーザーの権限を admin に変更できる／developer 行と自分の行は変更不可
- [ ] M-PRICE ON: A-02 に料金列が出る → 施設に単価設定 → U-03 に見積りが表示され、予約後に `reservation_prices` に記録される
- [ ] M-ITEM ON: A-06 で備品登録 → U-03 で備品を選択して予約 → `reservation_items` に貸出時点の単価で記録される／使用中備品は A-06 で削除できない
- [ ] M-EXTEND ON: A-02 で施設を延長可に → 利用中の自分の予約で延長（15/30/45/60分）→ 延長帯に他予約があると中止される
- [ ] M-INQUIRY ON: U-05 から問い合わせ送信 → A-07 で返信 → U-05 に返信が表示される／他人の問い合わせは見えない（RLS）
- [ ] M-DISPLAY ON: `/display` が30秒間隔で自動更新され、フルスクリーン切替できる／`/display/[id]` に利用中/空きが出る
- [ ] M-THEME ON: A-09 でテンプレート変更 → 主要ボタン・タブ・スピナーの色が変わる／ロゴURL設定で Header のロゴが替わる
- [ ] 各モジュール OFF: 対応する画面・導線が消え、直アクセスがリダイレクトされる

### Phase3 機能

- [ ] A-04: CSVエクスポート → フィルター適用後の一覧がExcelで文字化けせず開ける
- [ ] M-ITEM ON: 同一時間帯に総数を超える備品予約 → 中止されアラートが出る／A-06に貸出中数が出る
- [ ] M-PRICE ON: U-04の予約履歴に料金列が表示される
- [ ] M-INQUIRY ON: U-05/A-07が吹き出し形式（自分=右・テーマ色）で表示される
- [ ] M-THEME ON: A-09でフォント変更 → 全画面のフォントが変わる
- [ ] M-DISPLAY ON: A-08のサイネージ表示設定で「本日の時間帯一覧」をOFF → D-01/D-02から消える
- [ ] M-NOTIFY ON（要デプロイ）: 予約確定・キャンセル・問い合わせ投稿でメールが届く
- [ ] M-TENANT ON: テナント作成 → ユーザーを割当 → 割当ユーザーは自テナント+共有のデータのみ見える／新規作成の施設・カテゴリ・備品・問い合わせは自テナントに自動割当される／**予約は施設のテナントに割当される**（共有施設の予約は全テナントに見え、テナントを跨いだ重複チェックが効く）／developerは全テナントを閲覧できる

## 設計判断メモ（設計書からの意図的な補正・逸脱）

実装は設計書3点に準拠していますが、以下は設計書の不整合・不足に対する意図的な補正です。

1. **admin 用 RLS ポリシーの追加**: DB設計書 §4.4 は `reservations_update_own`（自分の予約のみ）だけのため、そのままでは A-04 予約管理での他人の予約の編集・キャンセル・復元が「0行更新」として静かに失敗する。`reservations_update_admin` を追加した。
2. **SELECT ポリシーを `TO authenticated` に限定**: 「全員閲覧可」を未ログインに開放すると anon キーだけで全ユーザーのメールアドレスが読めるため、ログイン済みユーザーに限定した。
3. **role の自己変更を禁止**: `profiles_update_own` の `WITH CHECK` で role 列の変更を禁止した（API 直叩きで一般ユーザーが自分を admin に昇格できる穴を塞ぐ）。昇格は SQL Editor から行う。
4. **モジュールは12件**: DB設計書 §3.1.5 の初期データは11行だが、要件定義書 v2.3 §3.1 と画面設計書 A-08 に M-THEME が含まれるため12行とした（M-THEME 追加時の追従漏れと判断）。
5. **`completed` ステータスは表示時に導出**: 「end_time 経過後に自動更新 or バッチ処理」（要件 §7.3）のバッチが未定義のため、Phase1 では DB 値は `confirmed` のまま、表示時に終了時刻を過ぎていれば「完了」バッジを表示する。操作可否（編集・キャンセル等）も表示ステータス基準。
6. **A-01 の URL は `/admin/dashboard`**: 画面設計書 §2.1 の表は `/admin` だが、§4.8 と改訂履歴 v2.0 に従い `/admin/dashboard` とした（`/admin` はリダイレクト）。
7. **U-03 編集モーダルに日時入力欄を設置**: 画面設計書 §4.6 のワイヤーフレームは日時がテキスト表示のままだが、仕様表「開始日時・終了日時・利用人数・目的を更新」と改訂履歴 v1.5 を優先した。
8. **A-04 の新規予約は管理者自身の名義で登録**: 画面設計書 §4.11 の新規予約モーダルに予約者の選択欄がないため。
9. **カレンダーは自作の日別グリッド**: 要件 §8.1 に react-big-calendar とあるが、Phase1 は日別ビューのみ（週/月表示は将来対応）のため追加依存なしの自作グリッドとした。

### Phase2 での補正・逸脱

10. **Phase2 テーブルの RLS・インデックスを補完**: DB設計書 §4 は Phase1 テーブルのみのため、同じ方針（参照は authenticated、マスタ更新は admin、予約付随は本人+admin、問い合わせは本人+admin のみ参照可）で `schema_phase2.sql` に定義した。
11. **A-05 用の `profiles_update_admin` を追加**: admin は他ユーザーの role を user/admin にのみ変更でき、developer 行は変更不可（画面設計書 §4.12）。RLS は列単位の制限ができないため role 以外の列も更新可能になる点は既知の制約。UI では自分自身の行も変更不可にした（自己降格による管理不能を防ぐ）。なお一覧の ID 列は、`profiles` の PK が UUID（ワイヤーフレームの連番と異なる）のため表示していない。
12. **新パスワード設定画面（`/reset-password/update`）を追加**: 画面設計書 §4.2 はメール送信画面のみのため、リカバリーリンクの着地画面を補完した。
13. **テーマの保存先は `module_settings.config`**: DB設計書にテーマ用テーブルが無いため、M-THEME 行の config（JSONB）に `{template, customColor, logoUrl}` を保存する。ロゴはURL指定のみ（アップロードは Supabase Storage 導入が必要なため未対応）。
14. **料金は時間単位で切り上げ**: 施設料金 = ceil(利用分数 / time_unit) × 単価。`reservation_prices.subtotal` には施設料金+備品料金の合計を予約確定・変更・延長のたびに再計算して記録する。
15. **サイネージは要ログイン・個人情報非表示**: RLS が authenticated 前提のため、サイネージ端末は表示用アカウントでログインして運用する。公共の場に表示するため予約者名・利用目的は表示しない。
16. **サイドバーへの A-06 / A-07 / U-05 の配置**: 画面設計書 §3.2 のグループ構成に無いため、備品管理は「施設・予約」、問い合わせ管理は「ユーザー」グループ、ユーザー画面の問い合わせは「予約」の下に配置した。
17. **時間延長は編集モーダル内に設置**: U-06 は独立モーダルではなく、利用中の自分の予約の編集画面（U-03）内のセクションとした（対象条件: M-EXTEND 有効・施設が延長可・現在利用中）。

### Phase3 での補正・逸脱

18. **通知はIDのみを渡す設計**: Edge Function は呼び出し側から reservationId / inquiryId のみ受け取り、宛先・本文はサービスロールで DB から再構築する（宛先・本文の偽装を防ぐ）。通知は補助機能のため呼び出しは fire-and-forget とし、失敗・未デプロイでも本処理を妨げない。
19. **テナントの分離方式**: `tenant_id = NULL` は「共有（未割当）」で全テナントから見える。行作成時は BEFORE INSERT トリガーで自動割当する（アプリのクエリ変更不要）。割当元はテーブルにより異なる: **予約は施設のテナント**（作成者由来にすると共有施設の予約が他テナントから見えず、重複チェックがすり抜けて二重予約が成立するため）、**それ以外（カテゴリ・施設・備品・問い合わせ）は作成者の所属テナント**。developer は運用管理のため全テナントを閲覧でき、「テナント切り替え」（TENANT-02）は新規作成データの割当先を変える操作として機能する。
20. **ITEM-05（備品料金設定）は Phase2 で先行実装済み**（A-06 の貸出単価入力）。
21. **料金履歴（PRICE-03）は「予約ごとの現在の記録」の一覧**: `reservation_prices` は履歴テーブルではなく予約1件につき1行（変更時上書き）のため、金額の変遷までは追えない（既知の制約参照）。
22. **サイネージの施設名と利用中/空き表示は常時表示**（DISP-05 の設定対象外）: サイネージの主目的のため。

## 既知の制約

- **重複チェックはアプリ層で実施**しており、まったく同時の送信では理論上すり抜ける可能性がある。確実に防ぎたい場合は `supabase/schema.sql` 末尾のコメントアウトされた EXCLUDE 制約を適用する。
- **施設の削除は物理削除**で、紐づく予約（過去の履歴含む）も `ON DELETE CASCADE` で削除される。削除ガードは「確定済み予約あり」のみ（設計書どおり）。
- `facilities.time_unit`（予約単位）はカレンダーのスロットには未使用（1時間スロット固定）。**料金計算（M-PRICE）でのみ使用**している。
- **A-04 予約管理は予約を全件取得**し、施設・日付フィルターはクライアント側で絞り込む（Phase1 の規模を前提）。予約が数千件規模になる場合は、日付フィルターのサーバー側適用やページングの導入が必要。
- **備品の在庫競合チェックは未実装**（ITEM-04 在庫管理 = Phase3）。同一時間帯に複数予約が同じ備品を選ぶと総数を超え得る。上限は「備品の総数」のみ。
- **料金の履歴は持たない**（PRICE-03 = Phase3）。`reservation_prices.subtotal` は予約変更・延長のたびに上書きされる。
- **キャンセル時の料金・備品は削除しない**: キャンセルは status 変更のみ（論理削除）のため、記録された料金・備品はそのまま残る。復元時にも再利用される。
- **備品選択の保存は非原子的**（削除→挿入の2段階）。削除成功後に挿入が失敗すると選択が失われる（画面には警告を表示）。確実性が必要なら RPC（ストアドファンクション）でのトランザクション化が必要。
- **料金・備品の記録は U-03（ユーザーの予約モーダル）経由の操作でのみ更新される**。A-04（管理者の予約管理）のインライン編集で日時を変えても `reservation_prices` は再計算されない（A-04 は Phase1 実装のままのため。料金運用と管理者編集を併用する場合は A-04 への連携追加が必要）。
- **備品の在庫チェック（ITEM-04）はアプリ層のみ**: 重複予約チェックと同様、完全同時の送信では理論上すり抜けうる。
- **サブドメインによるテナント切替（tenants.subdomain）はルーティング未対応**: DNS・ホスティング設定が必要なため、subdomain は登録のみ。テナントの切替はユーザーの所属（profiles.tenant_id）で行う。
- **module_settings（モジュールON/OFF・テーマ等）はテナント別ではなく全体共通**（TENANT-03 の一部未対応）。
- **メール通知は失敗を通知しない**（fire-and-forget）。到達保証が必要な場合はキュー・リトライの導入が必要。リマインダー（NOTIF-02）はスケジュール設定（毎日実行）が前提。
- **schema_phase3.sql 適用後、既存データは「共有（tenant_id=NULL）」のまま**で全テナントから見える。テナント運用を始める場合は既存行の tenant_id を割り当てること。
- **`tenants.is_active` は保存のみで、無効テナントの利用制限（所属ユーザーのアクセス遮断等）は未実装**。DB設計書にカラム定義のみで挙動の規定がないため。
- **共有備品（tenant_id=NULL）を複数テナントで併用する場合、在庫チェック（ITEM-04）はテナント内でのみ有効**。他テナントの予約は RLS で見えないため、テナントを跨いだ貸出合計は検証できない（備品もテナントごとに登録する運用を推奨）。
