# M-FACILITY（汎用施設管理システム）

専門学校卒業制作で作成したPHP版施設管理システムを、モダンな技術スタックでフルリライトしたWebアプリケーションです。

## 概要

企業の会議室、レンタルスペース、カラオケ店の部屋など、さまざまな「施設」の予約を管理するシステムです。モジュール設計により、顧客ごとに必要な機能のみをON/OFFして提供できます。

## 技術スタック

| 層 | 技術 |
|----|------|
| フレームワーク | Next.js（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| バックエンド / DB | Supabase（PostgreSQL） |
| 認証 | Supabase Auth |

## 実装済み機能（Phase 1）

### 一般ユーザー向け

- **予約カレンダー（U-02）** — 時間×施設のグリッド表示、日付ナビゲーション、空きセルクリックで予約作成
- **予約詳細モーダル（U-03）** — 予約の閲覧・編集・キャンセル、開始/終了日時の変更、重複チェック
- **マイページ（U-04）** — プロフィール表示・編集、予約履歴（直近5件/全件切替）

### 管理者向け

- **施設管理（A-02）** — 施設のCRUD、インライン編集、カテゴリフィルター
- **カテゴリ管理（A-03）** — カテゴリのCRUD、インライン編集
- **予約管理（A-04）** — 予約の一覧・編集・キャンセル・復元、施設/日付フィルター
- **システム設定（A-08）** — モジュールのON/OFFトグル（developer権限のみ）

### 認証

- **ログイン / 新規登録（C-01）** — メール・パスワード認証
- **パスワードリセット（C-03）**

### データ整合性

- 施設削除時の予約存在チェック（DB側RESTRICT + アプリ側チェックの二重防御）
- 予約作成・更新時の重複チェック（同一施設・同一時間帯の二重予約防止）
- 予約更新時の自己除外（`.neq('id', ...)` で自分の予約と重複判定しない）

## モジュール構成

機能をモジュール単位でON/OFFし、顧客ごとに必要な機能だけを提供できます。

| モジュール | 説明 | Phase 1 |
|-----------|------|---------|
| M-CORE | コアシステム（認証・基本設定） | ✅ ON固定 |
| M-USER | ユーザー管理 | ✅ ON固定 |
| M-FACILITY | 施設管理 | ✅ ON固定 |
| M-RESERVE | 予約機能 | ✅ |
| M-EXTEND | 時間延長 | Phase 2 |
| M-DISPLAY | デジタルサイネージ | Phase 2 |
| M-PRICE | 料金計算 | Phase 2 |
| M-ITEM | 備品管理 | Phase 2 |
| M-INQUIRY | 問い合わせ | Phase 2 |
| M-NOTIFY | メール通知 | Phase 2 |
| M-THEME | テーマカスタマイズ | Phase 2 |
| M-TENANT | マルチテナント | Phase 3 |

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                    # ログイン / 新規登録（C-01）
│   ├── reservations/
│   │   └── page.tsx                # 予約カレンダー（U-02）
│   ├── mypage/
│   │   └── page.tsx                # マイページ（U-04）
│   └── admin/
│       ├── categories/
│       │   └── page.tsx            # カテゴリ管理（A-03）
│       ├── facilities/
│       │   └── page.tsx            # 施設管理（A-02）
│       ├── reservations/
│       │   └── page.tsx            # 予約管理（A-04）
│       └── settings/
│           └── page.tsx            # システム設定（A-08）
├── components/
│   └── Header.tsx                  # 共通ヘッダー
└── lib/
    └── supabase.ts                 # Supabaseクライアント
```

## データベース

| テーブル | 説明 |
|---------|------|
| profiles | ユーザー情報（auth.usersと1:1） |
| categories | 施設カテゴリ |
| facilities | 施設 |
| reservations | 予約 |
| module_settings | モジュールON/OFF設定 |

詳細は `documents/02_DB設計書_v1.0.md` を参照。

## セットアップ

### 前提条件

- Node.js 18以上
- Supabaseアカウント

### 手順

1. リポジトリをクローン
```bash
git clone https://github.com/your-username/facility_reservation_system.git
cd facility_reservation_system
```

2. 依存パッケージをインストール
```bash
npm install
```

3. 環境変数を設定（`.env.local`を作成）
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Supabaseでテーブルを作成（`documents/02_DB設計書_v1.0.md` のSQL参照）

5. 開発サーバーを起動
```bash
npm run dev
```

6. ブラウザで `http://localhost:3000` にアクセス

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `documents/01_要件定義書_v2.3.md` | 要件定義、モジュール構成、技術スタック |
| `documents/02_DB設計書_v1.0.md` | テーブル定義、ER図、RLS設定 |
| `documents/03_画面設計書_v1.5.md` | 画面一覧、ワイヤーフレーム、仕様 |

## 開発期間

| 期間 | 作業内容 |
|------|---------|
| 2026/01 | 環境構築、DB設計、M-USER（認証） |
| 2026/02 | M-FACILITY（施設・カテゴリ管理）、M-RESERVE（管理者用予約管理） |
| 2026/05 | 管理画面フィルター、M-RESERVE（ユーザー向けカレンダー・マイページ）、M-CORE（システム設定） |

## ユーザー種別

| 種別 | 説明 | 権限 |
|------|------|------|
| user | 一般ユーザー | 予約の作成・変更・キャンセル |
| admin | 管理者 | 施設・予約・ユーザーの管理 |
| developer | 開発者 | モジュールのON/OFF設定 |

## ライセンス

MIT