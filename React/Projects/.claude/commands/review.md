# /review - M-FACILITY コードレビュー

指定されたファイルを読み込み、以下の観点でレビューしてください。
**コードの修正は行わず、問題箇所の指摘のみを行うこと。**

---

## レビュー手順

1. 対象ファイルを全て読み込む（推測でレビューしない）
2. CLAUDE.md のコーディング規則を参照する
3. ★★★ の項目を優先的にチェック
4. 指摘は優先度順に最大3つに絞る
5. 各指摘に before / after の例を添付
6. 修正理由を「なぜ問題か」「放置するとどうなるか」で説明

---

## チェック項目

### ■ A. ボタン規則（M-FACILITY固有・必ず確認）

**A-1 ★★★ onClick が `() =>` 形式で統一されているか**
```ts
onClick={() => handleXxx()}  // ✅
onClick={handleXxx}          // ❌
```

**A-2 ★★★ ボタンの色・定数が用途と合っているか**
| 用途 | 正しい定数 |
|------|-----------|
| 閉じる・非破壊キャンセル | `BUTTON_SECONDARY` |
| 削除・破壊的キャンセル | `BUTTON_DANGER` |
| 主要アクション | `BUTTON_PRIMARY` |
| 復元・完了 | `BUTTON_SUCCESS` |

**A-3 ★★★ ボタン配置が「左=非破壊、右=主要アクション」になっているか**

**A-4 ★★☆ ボタンラベルの形式が正しいか**
| 場所 | 形式 | 例 |
|------|------|-----|
| 一覧画面上部（モード切替） | 名詞形 | `編集` `予約キャンセル` |
| パネル・モーダル内（実行） | 動詞形 | `更新する` `予約をキャンセルする` |

---

### ■ B. 命名・意図の明示

> 原則: **「間違ったコードは間違って見える」（Joel Spolsky / Application Hungarian）**
> 変数名に「データの種類・状態・出所」を含めることで、**コードを1行見ただけで誤用が視覚的に分かる**ようにする。
> 型（TypeScript）が同じでも「意味」が違えば名前で区別する。

**B-1 ★★★ 名前だけで型・用途・出所が読み取れるか**

以下の3観点で、**1行見ただけで誤りに気づける命名**になっているかをチェックする。

**(1) 安全/未検証の区別** — `raw` / `sanitized` / `validated` などで状態を表しているか
```ts
// ❌ 検証前後が名前で区別できない。未検証のまま使っても気づけない
const input = e.target.value
await supabase.from('facilities').insert({ name: input })

// ✅ 状態が名前に出る。未検証データの混入が「見て」分かる
const rawName = e.target.value
const validatedName = rawName.trim()
if (!validatedName) return
await supabase.from('facilities').insert({ name: validatedName })
```

**(2) データの出所の区別** — どこから来たIDか名前で分かるか
```ts
// ❌ どちらも userId。出所が違うのに同じ名前 → 取り違えに気づけない
const userId = session.user.id
const userId2 = formValues.userId

// ✅ 出所が名前に出る。認証由来とフォーム由来の混在が「見て」分かる
const userIdFromAuth = session.user.id   // セッション（信頼できる）
const userIdFromForm = formValues.userId // フォーム入力（未検証）
// 保存する user_id に userIdFromForm を使っていたら一目で危険と分かる
```
> 出所が違うIDを混在させると、なりすまし等のセキュリティバグや論理バグになる。
> 特に Supabase の `user_id` には「セッション由来の値」を使う（フォーム/URL由来を使わない）。

**(3) 代入の両辺で意味が一致しているか** — 型が同じでも「種類」が一致しているか
```ts
// ❌ 型はどちらも number だが、意味が違う（施設ID ← 予約ID）
const facilityId = reservation.id        // 予約のIDを施設IDに入れている！
// → Application Hungarian なら名前から「facility ← reservation」のズレが見える

// ✅ 左辺と右辺の「種類」が一致している
const facilityId = reservation.facility_id
```

**B-2 ★★★ マジックナンバー・マジックストリングが定数化されているか**

`status` の文字列リテラル（`'confirmed'` / `'cancelled'` / `'completed'`）を直接比較していないか。
```ts
// ❌ タイポしてもエラーにならず、常に false になるだけ → 気づけない
if (reservation.status === 'confiremd') { ... }

// ✅ 定数（または型）経由で比較し、タイポをコンパイル時に弾く
if (reservation.status === RESERVATION_STATUS.CONFIRMED) { ... }
```
- 営業時間や上限などの数値も `BUSINESS_HOUR_START` のように定数化されているか
- Supabase から取得した**生データ**と、`formatDateTime()` 等で**加工済みのデータ**を同じ名前で扱っていないか

**B-3 ★★☆ プロジェクトの命名規則と一致しているか**（CLAUDE.md参照）
- 型 PascalCase / DBカラム snake_case / state camelCase / 定数 UPPER_SNAKE_CASE

---

### ■ C. 構造・コロケーション

**C-1 ★★★ 1関数が長すぎないか（1画面で収まるか）**

**C-2 ★★☆ 変数宣言は使用箇所の近くにあるか**

**C-3 ★★☆ 同じパターンが2箇所以上あれば `lib/` への共通化を検討しているか**

---

### ■ D. エラー処理・防御

**D-1 ★★★ null / undefined のケースを処理しているか**
- Supabase の戻り値、`find()` の結果、ユーザー入力

**D-2 ★★★ 破壊的操作（削除・キャンセル）に確認ステップがあるか**

**D-3 ★★★ ボタン連打（多重送信）を防止しているか**
- 処理中は disabled にしているか

---

### ■ E. UI・操作安全性

**E-1 ★★★ モーダルを開くとき、前回の値がリセット（または上書き）されているか**

**E-2 ★★☆ グレーアウト（操作不可）の条件が設計書と一致しているか**
- 編集モード：`cancelled` 行は選択不可
- キャンセルモード：`cancelled` 行は選択不可
- 復元モード：`confirmed` 行は選択不可

---

## 出力フォーマット

```
## レビュー結果: {ファイル名}

### 指摘 1（★★★）: {タイトル}

**問題箇所（行番号）:**
{コードスニペット}

**なぜ問題か:**
...

**放置するとどうなるか:**
...

**修正イメージ:**
Before:
{修正前}

After:
{修正後}

---

### 指摘 2（★★☆）: ...

---

## 問題なし ✅
- {問題なかった観点を列挙}
```