# 家計簿アプリ向けAIコーディングエージェント指示書

## プロジェクト概要
ExpoベースのReact Nativeで構築された家計簿管理アプリです。カテゴリ別支出追跡、AsyncStorageによる永続データ保存、チャート表示、ダーク/ライトテーマ対応が特徴です。

## アーキテクチャと主要パターン

### ファイルベースルーティング（Expo Router）
- **ルートレイアウト**: `app/_layout.tsx` - テーマプロバイダーとメインスタック
- **タブナビゲーション**: `app/(pages)/_layout.tsx` - 現在は"家計簿"タブ1つ
- **メイン画面**: `app/index.tsx`（444行）- 支出ロジックと状態管理：
  - 支出履歴（STORAGE_KEY = `@expense_history`）
  - カテゴリ（STORAGE_KEY = `@app_categories`）
  - 日付選択とチャート表示
- **ページコンポーネント**: `app/(pages)/*.tsx` - サブコンポーネント（`InputItem`, `CategorySettings`）をPropsで渡す

### データ永続化パターン
- **AsyncStorage**を唯一のデータ保存手段として使用（バックエンド無し）
- 状態変更時は必ず`saveData()`を呼び出して永続化
- カテゴリはアプリ起動時に`index.tsx`の`useEffect`で読み込み
- インターフェースはコンポーネントファイル内に定義（例：`index.tsx`内の`HistoryItem`）

### テーミングシステム
- テーマ色定義: `constants/theme.ts` - `Colors`オブジェクトにライト/ダークモード対応
- `useThemeColor()`フックでスキーム適応
- `ThemedText`, `ThemedView`がReact Nativeコンポーネントをテーマ対応させる
- プラットフォーム別フォントは`Fonts`定数で管理

### コンポーネント構成
- **共有UIコンポーネント**: `components/` - `ThemedText`, `ThemedView`, `HapticTab`
- **ページレベルコンポーネント**: `app/(pages)/` - ステートフルなページ画面
- **Propsパターン**: 状態セッターをPropsで受け取る（Context/Redux未使用）- `InputItem.tsx`の10-19行参照
- **ハプティックフィードバック**: ナビゲーション用の`HapticTab`

## 開発ワークフロー

### 実行コマンド
```bash
npm start              # 開発サーバー起動
npm run android        # Androidエミュレータ実行
npm run ios            # iOSシミュレータ実行
npm run web            # Web実行
npm run lint           # ESLint実行
npm run reset-project  # テンプレートへリセット
```

### テスト・デバッグ
- **リント**: `eslint-config-expo`経由のESLint - コミット前に実行
- **AsyncStorage検査**: デバイス/エミュレータストレージに保存 - React Native DebuggerまたはConsoleで確認
- **テーマ切り替え**: デバイスシステム設定で確認（アプリUIに手動切り替えはまだ未実装）

## プロジェクト固有の慣例

### 日本語UI・多言語化
- **すべてのUI文字列は日本語でハードコード**（i18nライブラリ未使用）
- カテゴリデフォルト: `['食費', '日用品', 'その他']`
- 画面モード: `'history' | 'add' | 'settings'`
- 機能追加時もカテゴリとUI文字列は日本語で統一

### 状態管理
- **Redux/Zustand未使用** - React Hooks + Propsドリリング
- 親（`index.tsx`）が全アプリ状態を管理。子コンポーネント（`InputItem`, `CategorySettings`）は表示層のみ
- 新機能追加時：
  1. `index.tsx`でuseState/useEffectで状態定義
  2. 状態とセッターを子コンポーネントにPropsで渡す
  3. 変更後`saveData()`または`AsyncStorage.setItem()`を呼び出し

### プラットフォーム固有の考慮
- **newArchEnabled: true** in `app.json` - React Native New Architecture使用
- **Web対応**: `expo start --web`で実行（静的出力）
- **Android端末の端まで表示**: `app.json`で有効化
- Web専用フック追加時は`use-color-scheme.web.ts`を参照

## 重要ファイル一覧
- **メインロジック**: [app/index.tsx](app/index.tsx) - 444行。支出リスト、カテゴリ、日付選択、チャート処理
- **入力フォーム**: [app/(pages)/InputItem.tsx](app/(pages)/InputItem.tsx) - 支出データ入力UI
- **ページルート**: [app/(pages)/_layout.tsx](app/(pages)/_layout.tsx) - タブ構成管理
- **テーマ設定**: [constants/theme.ts](constants/theme.ts) - 全色定義
- **パッケージ設定**: [package.json](package.json) - ビルドスクリプト、Expoプラグイン

## 主要依存パッケージ
- **expo-router** v6.0.21 - ファイルベースルーティング
- **@react-native-async-storage/async-storage** v2.2.0 - 永続ストレージ
- **react-native-chart-kit** v6.12.0 - 円グラフ表示
- **@react-native-community/datetimepicker** v8.4.4 - 日付選択
- **expo-haptics** - 振動フィードバック
- **react-native-reanimated** - アニメーション（導入済みだが未使用）

## よくあるタスク

### 新しい支出カテゴリ追加
1. `app/index.tsx`の`addCategory()`関数でカテゴリリストを更新
2. `AsyncStorage.setItem(CATEGORY_STORAGE_KEY, ...)`で永続化
3. `setCategories()`の状態更新で自動再レンダリング

### 新しいページ作成
1. `app/(pages)/ページ名.tsx`を作成
2. `app/(pages)/_layout.tsx`に`<Tabs.Screen name="ページ名" ... />`を追加
3. 必要に応じて`app/index.tsx`から状態をPropsで渡す

### スタイル指定ガイドライン
- パフォーマンスのため`StyleSheet.create()`を使用（インラインスタイル不可）
- テーマ対応色は`Colors[colorScheme]`を活用
- 例：[components/themed-text.tsx](components/themed-text.tsx)がテーミングパターンを示している

