# 🏢 汎用施設管理システム（React版）

専門学校卒業制作で作成したPHP版「汎用的施設管理システム」を、モダンな技術スタックでフルリライトするプロジェクトです。

> **📢 前提知識の学習記録**  
> このプロジェクトの前提となるJavaScript・React基礎の学習記録は  
> **[Claude_learning_js](https://github.com/nanka1570/Claude_learning_js)** にあります。

---

## 🎯 プロジェクトの目的

### システム開発の目的
- ユーザビリティの改善（予約フロー6ステップ→3ステップ）
- モジュール設計の改善（機能のON/OFF切り替え可能）
- 実務レベルのポートフォリオ作成

### 技術学習の目的
このプロジェクトを通じて以下の技術を習得します：
- **Next.js**（App Router）- ファイルベースルーティング、Server/Client Components
- **TypeScript** - 型定義、Props型付け、ジェネリクス
- **Tailwind CSS** - ユーティリティクラス、レスポンシブデザイン
- **Supabase** - 認証、データベース、RLS

---

## 📊 プロジェクト進捗

```
■■■■■■■□□□ 70% - Phase 1 進行中（M-RESERVE実装中）
```

| フェーズ | 内容 | 時間 | 進捗 |
|---------|------|------|------|
| Phase 1 | コア機能 | 50h | 🔄 70% |
| Phase 2 | 拡張機能 | 40h | ⏳ 予定 |
| Phase 3 | 高度な機能 | 30h | ⏳ 予定 |

**総開発時間: 120時間**

---

## 🛠️ 技術スタック

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

| 層 | 技術 | 選定理由 |
|----|------|---------|
| フレームワーク | **Next.js 14+** (App Router) | SSR対応、Vercelとの相性◎ |
| 言語 | **TypeScript** | 型安全、保守性向上 |
| スタイリング | **Tailwind CSS** | 高速開発、レスポンシブ対応 |
| バックエンド | **Supabase** | BaaSで開発効率化 |
| データベース | **PostgreSQL** | Supabase標準 |
| 認証 | **Supabase Auth** | メール認証 |
| ホスティング | **Vercel** | Next.jsと相性◎ |
| カレンダーUI | **react-big-calendar** | 予約表示（予定） |

---

## 🎯 システムコンセプト

```
┌─────────────────────────────────────────────────────────────┐
│            汎用施設管理システム（コア）                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ユーザー │ │ 施設   │ │ 予約   │ │ 表示   │          │
│  │ 管理   │ │ 管理   │ │ 機能   │ │ 機能   │  ...     │
│  │モジュール│ │モジュール│ │モジュール│ │モジュール│          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│       ON        ON        ON/OFF      ON/OFF              │
└─────────────────────────────────────────────────────────────┘
        ↓
    顧客Aには予約+表示を提供
    顧客Bには予約+料金+備品を提供
    顧客Cにはフル機能を提供
```

### 特徴

- 🧩 **モジュール型設計** - 機能のON/OFF切り替えが可能
- 📱 **レスポンシブ対応** - PC・タブレット・スマートフォン対応
- 🎨 **モダンUI/UX** - 直感的な予約フロー（6ステップ→3ステップに簡略化）
- 🏢 **マルチテナント対応** - 複数組織での利用が可能（Phase 3）

### 想定利用シーン

- 企業の会議室予約
- カラオケ店の部屋管理
- レンタルスペースの予約
- 学校の教室・設備予約
- 公共施設の予約管理

---

## 📦 モジュール構成

| モジュール | 説明 | デフォルト | フェーズ | 進捗 |
|-----------|------|-----------|---------|------|
| **M-CORE** | コアシステム（認証・基本設定） | ON（固定） | Phase 1 | ⏳ |
| **M-USER** | ユーザー管理 | ON（固定） | Phase 1 | ✅ |
| **M-FACILITY** | 施設管理 | ON（固定） | Phase 1 | ✅ |
| M-RESERVE | 予約機能 | ON/OFF | Phase 1 | 🔄 |
| M-EXTEND | 時間延長 | ON/OFF | Phase 2 | ⏳ |
| M-DISPLAY | デジタルサイネージ | ON/OFF | Phase 2 | ⏳ |
| M-PRICE | 料金計算 | ON/OFF | Phase 2 | ⏳ |
| M-ITEM | 備品管理 | ON/OFF | Phase 2 | ⏳ |
| M-INQUIRY | 問い合わせ | ON/OFF | Phase 2 | ⏳ |
| M-NOTIFY | 通知機能 | ON/OFF | Phase 3 | ⏳ |
| M-THEME | テーマカスタマイズ | ON/OFF | Phase 2 | ⏳ |
| M-TENANT | マルチテナント | ON/OFF | Phase 3 | ⏳ |

### モジュール依存関係

```
M-CORE（必須）
  └── M-USER（必須）
        └── M-FACILITY（必須）
              ├── M-RESERVE（任意）
              │     ├── M-EXTEND（任意）
              │     ├── M-PRICE（任意）
              │     └── M-ITEM（任意）
              ├── M-DISPLAY（任意）
              └── M-INQUIRY（任意）
  └── M-NOTIFY（任意）
  └── M-THEME（任意）
  └── M-TENANT（任意）
```

---

## 📅 開発スケジュール

### Phase 1: コア機能（50時間）

| 項目 | 時間 | 内容 | 進捗 |
|------|------|------|------|
| 環境構築・DB設計 | 10h | Supabase設定、テーブル作成、RLS設定 | ✅ |
| M-USER | 10h | ログイン/ログアウト、ユーザー登録 | ✅ |
| M-FACILITY | 10h | 施設CRUD、カテゴリCRUD | ✅ |
| M-RESERVE | 15h | 予約カレンダー、予約CRUD、重複チェック | 🔄 |
| M-CORE | 5h | モジュール設定画面、基本設定 | ⏳ |

### Phase 2: 拡張機能（40時間）

| 項目 | 時間 | 内容 |
|------|------|------|
| M-EXTEND | 5h | 時間延長機能 |
| M-DISPLAY | 10h | サイネージ画面、自動更新 |
| M-PRICE | 8h | 料金設定、予約時料金表示 |
| M-ITEM | 10h | 備品CRUD、予約時の備品選択 |
| M-INQUIRY | 12h | 問い合わせ投稿、チャット形式表示 |

### Phase 3: 高度な機能（30時間）

| 項目 | 時間 | 内容 |
|------|------|------|
| M-NOTIFY | 15h | メール送信設定、各種通知 |
| M-TENANT | 10h | テナント管理、データ分離 |
| 仕上げ | 5h | UI/UXブラッシュアップ、テスト |

---

## 📊 PHP版からの改善点

| 項目 | PHP版 | React版 |
|------|-------|---------|
| 予約フロー | 6ステップ | **3ステップ** |
| モバイル対応 | なし | **レスポンシブ対応** |
| 空き状況確認 | ページ遷移が必要 | **リアルタイム表示** |
| モジュール管理 | 拡張機能テーブル | **設定画面でON/OFF** |
| 認証方式 | 秘密の質問 | **メール認証** |
| ユーザーID | varchar(30) | **UUID** |

---

## 🚀 セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/nanka1570/facility_reservation_system.git

# ディレクトリに移動
cd facility_reservation_system/React/Projects

# 依存関係をインストール
npm install

# 環境変数を設定（.env.local を作成）

# 開発サーバーを起動
npm run dev
```

### 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📄 ドキュメント

| ドキュメント | バージョン | 状態 |
|-------------|-----------|------|
| [要件定義書](./docs/01_要件定義書_v2_3.md) | v2.3 | ✅ 完成 |
| [DB設計書](./docs/02_DB設計書_v1_0.md) | v1.0 | ✅ 完成 |
| [画面設計書](./docs/03_画面設計書_v1_2.md) | v1.2 | ✅ 完成 |
| API設計書 | - | ⏳ 作成予定 |

---

## 🔧 習得した技術パターン

### React / Next.js
- `useState`, `useEffect`, `useRouter`
- App Router でのルーティング
- Client Components (`'use client'`)

### Supabase
- 認証（signUp, signIn, signOut, getSession）
- CRUD操作（select, insert, update, delete）
- RLS（Row Level Security）

### UIパターン
- インライン編集
- モーダル（外側クリックで閉じる、`stopPropagation`）
- refreshKeyによる再取得
- `find()`でID→名前変換

### Tailwind CSS
- Flexbox（`flex`, `flex-col`, `gap`, `justify-between`）
- レスポンシブ対応
- hover, rounded, shadow

---

## 🔗 関連リポジトリ

| リポジトリ | 内容 |
|-----------|------|
| **[Claude_learning_js](https://github.com/nanka1570/Claude_learning_js)** | JavaScript・React基礎学習 |
| **このリポジトリ** | 施設予約システム（ポートフォリオ） |

---

## 📝 開発記録

| 日付 | 内容 |
|------|------|
| 2026/2/5 | M-RESERVE: 新規予約モーダル完成、詳細モーダル実装中 |
| 2026/2/4 | 画面設計書v1.2作成、モーダル外クリックで閉じる機能実装 |
| 2026/2/3 | M-RESERVE: 予約一覧表示、新規予約INSERT機能 |
| 2026/2/2 | M-RESERVE: 予約管理画面の基本実装開始 |
| 2026/1/26 | M-FACILITY: 施設管理CRUD完成 |
| 2026/1/19 | M-FACILITY: カテゴリ管理CRUD完成 |
| 2026/1/12 | M-USER: 認証機能完成、ダッシュボード実装 |
| 2026/1/9 | DB設計書v1.0、画面設計書v1.0作成 |
| 2026/1/7 | 要件定義書v2完成（モジュール構成、技術学習目標追加） |
| 2026/1/6 | 要件定義完了、README作成、環境構築準備 |
| 2026/1/4 | PHP版コードをGitHubにアップロード |

---

*Last Updated: 2026/2/5*