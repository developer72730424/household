# 家計簿アプリ向けAIコーディングエージェント指示書

## プロジェクト概要
Expo（React Native）+ expo-router で作った「シンプル家計簿」。アカウント不要・端末内保存のみ・UIは日本語。
支出/収入の記録、カテゴリ、予算、固定費の自動登録、統計、検索、バックアップ/復元、ダークモードに対応。

## ディレクトリ構成
```
app/                 expo-router のルート（1ファイル = 1画面）。薄い接続層だけを置く
  _layout.tsx        共通ヘッダー + AppDataProvider + Stack
  index.tsx          ホーム（月の収支・予算・履歴・＋ボタン・☰メニュー）
  add.tsx / income.tsx   支出・収入の入力と編集（?id= で編集、add は ?templateId= も可）
  statistics.tsx search.tsx recurring.tsx templates.tsx categories.tsx export.tsx
components/
  screens/           各画面の見た目（props で受け取るだけ。データ操作は持たない）
  calendar-modal.tsx 共通のカレンダー選択（日付入力はすべてこれを使う）
  budget-card.tsx backup-banner.tsx
context/app-data.tsx 全データの読み込み・移行・保存（唯一の保存窓口）
utils/               React Native に依存しない純粋な関数。テストの対象
  entries.ts         型・日付/金額の正規化・集計・旧データ移行
  recurring.ts       固定費の自動登録
  backup.ts          バックアップの作成/読み込み、案内の表示判定
hooks/               use-app-colors（配色）, use-go-back（戻る）
tests/               node:test による単体テスト（utils のみ）
plugins/             Expo config plugin（Xcode 27 ビルド対策）
```

## データの決まり（重要）
- 記録は `Entry`（`utils/entries.ts`）: `amount` は**正の整数（円）**、`date` は**`YYYY-MM-DD`（ゼロ埋め）**、収入か支出かは **`type`**（`'income' | 'expense'`）で持つ。
- 「収入」は予約名。カテゴリ名にはできない（`INCOME_LABEL`）。収入の記録のカテゴリは常に `収入`。
- 月の絞り込みは `monthKey(date)`（`YYYY-MM`）の**完全一致**で行う。`startsWith('2026-1')` のような前方一致は 10〜12月と混ざるので使わない。
- 金額入力は `validateAmountInput()`、日付は `toDateString()` / `dateFromString()` を通す。文字列連結で日付を作らない。
- 保存は **`useAppData()` の操作関数**（`addEntry` など）だけで行う。`AsyncStorage` を画面から直接触らない。
- 保存形式を変えるときは、`utils/entries.ts` の `normalizeEntry` 等で旧形式も読めるようにし、起動時の移行（`context/app-data.tsx` の `loadAll`）を更新する。バックアップ（`utils/backup.ts`）も旧バージョンを読めること。
- 保存キー: `@expense_history_Default`（履歴）, `@app_categories_Default`, `@app_templates_Default`, `@app_recurring_Default`, `@app_budget_Default`, `@app_last_backup_at`, `@app_backup_snooze_until`。旧形式の履歴は `@expense_history_Default_legacy_backup` に退避される。

## 画面を追加するとき
1. `components/screens/○○.tsx` に見た目を作る（データは props で受ける）。
2. `app/○○.tsx` を作って `useAppData()` から必要な値を渡す。戻る操作は `useGoBack()`。
3. 遷移は `router.push('/○○')`。ホームの `MENU_ITEMS`（`app/index.tsx`）に追加すればメニューから開ける。
4. 集計や判定のロジックは画面に書かず `utils/` に置いてテストを書く。

## 配色（ダークモード）
- 色は `useAppColors()`（`hooks/use-app-colors.ts`）で取り、`StyleSheet` は `const createStyles = (c: AppColors) => StyleSheet.create({...})` + `useMemo(() => createStyles(c), [c])` の形にする。色の直書きはしない（ブランドの白文字 `#fff` などは可）。
- チャートの色は `chartRgb` / `chartLabelRgb` を使う。

## 開発コマンド
```bash
npm start            # 開発サーバー
npm test             # 単体テスト（node:test、依存なし）
npx tsc --noEmit     # 型チェック
npm run lint         # ESLint（警告ゼロを維持する）
```
- 変更後は **型チェック・lint・テスト** をすべて通してからコミットする。
- 日付・金額・移行・集計・バックアップを変えたら `tests/` にテストを足す。

## 実機/シミュレーターで動かす
- iOS ネイティブビルドは `ios/`（gitignore 済み）を `npx expo prebuild --clean --platform ios --no-install` で作り直し、`pod install` → `xcodebuild`（スキーム名は `app`）。
- `plugins/with-xcode27-fixes.js` が Podfile を直す（Pod の最低 iOS を 15.1 に、fmt を C++17 に）。prebuild の後で `package.json` の `ios`/`android` スクリプトが `expo run:*` に書き換わるので元に戻すこと。
- `pod install` は `PATH="/usr/bin:$PATH" LANG=en_US.UTF-8` で実行する（Anaconda の curl が先に使われると Hermes の取得に失敗する）。
- Expo Go で試す場合は `npx expo start --offline`（`CI=1` は付けない。付けると編集が反映されない）。

## 注意
- UI文字列はすべて日本語で書く（i18n ライブラリは使っていない）。
- 起動時のデータ読み込みが終わるまで画面は出さない（`app/_layout.tsx` の `loaded`）。
- 固定費は起動時とアプリが前面に戻ったときに、発生日を過ぎた分を履歴へ追加する。
