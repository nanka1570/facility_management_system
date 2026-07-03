# 施設予約システム React版（fable-projects）

専門学校卒業制作の PHP 版「汎用施設管理システム」を、`React/documents/` の設計書3点（要件定義書 v2.3 / DB設計書 v1.0 / 画面設計書 v2.0）に従って Next.js でリライトしたものです。**Claude Code（Fable 5）が設計書のみを情報源として実装**しています（既存実装 `React/Projects/` は参照していません）。

実装スコープは **Phase1（コア機能）** です。

> **このプロジェクトの位置づけ**: 学習ワークフローにおける**見本（完成形）**です。進め方は「①最初にユーザー自身が `React/Projects/`（自作版）を実装 → ②fableが本見本を実装 → ③見本と自作版の両方を fable が比較評価（`React/documents/04_比較評価レポート_v1.2.md`）→ ④差分を自分の手で自作版に反映」。見本のコードを自作版へコピーすることはしません（詳細はリポジトリルートの README 参照）。

## 技術スタック

| 層 | 技術 |
|----|------|
| フレームワーク | Next.js 16（App Router / Turbopack） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Supabase（PostgreSQL + Auth） |
| 追加パッケージ | `@supabase/supabase-js` / `@supabase/ssr` のみ |

## 画面一覧（Phase1）

| 画面ID | 画面名 | URL | 権限 |
|--------|--------|-----|------|
| C-01 | ログイン / 新規登録 | `/` | 不要 |
| U-01 | ダッシュボード | `/dashboard` | ログイン済み |
| U-02 | 予約カレンダー（日別） | `/reservations` | ログイン済み |
| U-03 | 予約モーダル（新規/編集/閲覧） | （モーダル） | ログイン済み |
| U-04 | マイページ | `/mypage` | ログイン済み |
| A-01 | 管理者ダッシュボード | `/admin/dashboard` | admin 以上 |
| A-02 | 施設管理 | `/admin/facilities` | admin 以上 |
| A-03 | カテゴリ管理 | `/admin/categories` | admin 以上 |
| A-04 | 予約管理 | `/admin/reservations` | admin 以上 |
| A-08 | モジュール設定 | `/admin/settings` | developer のみ |

## セットアップ手順

### 前提

- Node.js 22 以上 / npm

### 1. Supabase プロジェクトを作成する

1. [supabase.com](https://supabase.com) にサインインし、新規プロジェクトを作成する（リージョン: Northeast Asia (Tokyo) 推奨）
2. プロジェクトの起動完了を待つ

### 2. データベーススキーマを適用する

1. Supabase Dashboard → **SQL Editor** を開く
2. [`supabase/schema.sql`](./supabase/schema.sql) の内容を全て貼り付けて **Run** する
3. **Table Editor** で以下を確認する
   - テーブル5つ: `profiles` / `categories` / `facilities` / `reservations` / `module_settings`
   - `module_settings` に12行（M-CORE〜M-TENANT）
   - `categories` に3行、`facilities` に4行

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

## 既知の制約

- **重複チェックはアプリ層で実施**しており、まったく同時の送信では理論上すり抜ける可能性がある。確実に防ぎたい場合は `supabase/schema.sql` 末尾のコメントアウトされた EXCLUDE 制約を適用する。
- **施設の削除は物理削除**で、紐づく予約（過去の履歴含む）も `ON DELETE CASCADE` で削除される。削除ガードは「確定済み予約あり」のみ（設計書どおり）。
- `facilities.time_unit`（予約単位）は Phase1 では未使用（カレンダーは1時間スロット固定）。
- **A-04 予約管理は予約を全件取得**し、施設・日付フィルターはクライアント側で絞り込む（Phase1 の規模を前提）。予約が数千件規模になる場合は、日付フィルターのサーバー側適用やページングの導入が必要。
