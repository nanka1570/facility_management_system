# M-FACILITY コーディング規則

## 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| 型 | PascalCase | `Profile`, `Facility` |
| DBカラム | snake_case | `max_capacity`, `is_active` |
| state | camelCase | `newFacilityId`, `editStartTime` |
| 定数 | UPPER_SNAKE_CASE | `BUTTON_PRIMARY`, `FIXED_MODULE_IDS` |
| ファイル | JSXなし→.ts / JSXあり→.tsx | - |

---

## ボタン規則

### スタイル（constants.ts の定数を使う）
| 定数 | 色 | 用途 |
|------|----|------|
| `BUTTON_PRIMARY` | bg-blue-400 | 主要アクション（保存・登録） |
| `BUTTON_SECONDARY` | bg-gray-200 | 閉じる・非破壊キャンセル |
| `BUTTON_DANGER` | bg-red-400 | 削除・破壊的キャンセル |
| `BUTTON_SUCCESS` | bg-green-400 | 復元・完了 |

### onClick は必ず `() =>` で統一
```ts
onClick={() => handleXxx()}   // ✅
onClick={handleXxx}           // ❌ 引数なしでも統一すること
```

### 配置ルール（画面設計書 3.3 準拠）
- 左: 非破壊アクション（閉じる・キャンセル）
- 右: 主要アクション（保存・登録・実行）

### ラベル規則
| 場所 | 形式 | 例 |
|------|------|-----|
| 一覧画面上部（モード切替ボタン） | 名詞形 | `編集` `予約キャンセル` `予約復元` |
| パネル・モーダル内（実行ボタン） | 動詞形 | `更新する` `予約をキャンセルする` `予約を復元する` |

---

## 実装パターン

```ts
// チェックボックスは checked 属性（value ではない）
<input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />

// useEffect は async にしない。内部に定義して呼ぶ
useEffect(() => {
  const load = async () => { ... }
  load()
}, [refreshKey])

// モーダル: オーバーレイクリックで閉じる（stopPropagation 必須）
<div onClick={() => setIsOpen(false)}>
  <div onClick={(e) => e.stopPropagation()}>...</div>
</div>

// 画面更新: refreshKey パターン
setRefreshKey(prev => prev + 1)

// ID→名前変換
facilities.find(f => f.id === facilityId)?.name
```

---

## Supabase パターン

```ts
// 1件取得
.select('*').eq('id', id).single()

// 一覧取得
.select('*').order('id', { ascending: true })

// 重複チェック（新規）
.eq('facility_id', facilityId).eq('status', 'confirmed')
.lt('start_time', endTime).gt('end_time', startTime)

// 重複チェック（更新：自己除外）
.neq('id', selfId)
.lt('start_time', endTime).gt('end_time', startTime)
```

### DBカラム名（タイポ注意：エラーが出ないので特に注意）
`max_capacity` / `is_active` / `start_time` / `end_time` / `num_people` / `facility_id` / `category_id` / `user_id` / `module_id` / `is_enabled`

---

## よくあるミス
| ミス | 正しい対処 |
|------|-----------|
| `next/router` を import | `next/navigation` を使う（App Router） |
| checkbox に `value` 属性 | `checked` 属性を使う |
| RLS権限エラー | profilesテーブルの role を確認 |
| DBカラム名のタイポ | エラーが出ないので目視確認 |

---

## 共通化基準
- 2つ以上のファイルで使う → `lib/` に切り出す
- 1箇所のみ → そのファイルに残す

---

## 対話スタイル（重要）

### 基本方針
- **実装の答えを直接出さない。ヒントを出して自分で考えさせる**
- 間違いがあれば指摘する。自分の言葉で説明し直したときは、誤りを正す
- 「70%理解したら進む」スタンスを後押しする（完璧主義を助長しない）
- 一度に多くの修正・指摘をしない（優先度をつけて最大3つ）

### 回答形式
- コード例は before / after で比較する
- 修正理由を「なぜ問題か」「放置するとどうなるか」で説明する
- 実務での使用頻度を示す（よく使う / たまに使う / ほぼ使わない）
- 過度に詳しい理論説明はしない（必要最小限）

### 実装相談のとき
1. まず「どう実装しようと思っているか」を聞く
2. 方針が正しければ進めさせる
3. 方針に問題があればヒントを出す（答えは出さない）
4. コードを書いた後にレビューする

### コードレビューのとき
- `/review` コマンドを使う
- コードの修正は行わず、指摘のみ
- 修正は自分で行う