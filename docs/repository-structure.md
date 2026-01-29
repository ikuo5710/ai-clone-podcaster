# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
ai-clone-podcaster/
├── src/
│   ├── client/                # フロントエンド（Vue.js）
│   │   ├── components/        # Vueコンポーネント
│   │   ├── composables/       # Composition API composables
│   │   ├── types/             # フロントエンド型定義
│   │   ├── App.vue            # ルートコンポーネント
│   │   └── main.ts            # エントリーポイント
│   └── server/                # バックエンド（Hono）
│       ├── controllers/       # HTTPリクエスト処理
│       ├── services/          # ビジネスロジック
│       ├── repositories/      # データ永続化
│       ├── types/             # バックエンド型定義
│       └── index.ts           # サーバーエントリーポイント
├── tests/
│   ├── unit/                  # ユニットテスト
│   │   └── server/            # サーバー側テスト
│   │       ├── services/
│   │       └── repositories/
│   └── e2e/                   # E2Eテスト（Playwright）
├── data/                      # ランタイムデータ（gitignore対象）
│   ├── voices/                # 声のメタデータ・音声ファイル
│   ├── bgm/                   # アップロードされたBGM
│   ├── temp/                  # TTS一時ファイル
│   └── output/                # 生成済みポッドキャスト
├── docs/                      # プロジェクトドキュメント
│   └── ideas/                 # アイデア・壁打ちメモ
├── .steering/                 # 作業単位のステアリングファイル
├── .claude/                   # Claude Code設定
├── .env                       # 環境変数（gitignore対象）
├── .env.example               # 環境変数テンプレート
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── CLAUDE.md
```

## ディレクトリ詳細

### src/client/ (フロントエンドディレクトリ)

#### components/

**役割**: Vueコンポーネントの配置

**配置ファイル**:
- `VoiceRecorder.vue`: 声の録音UI
- `VoiceList.vue`: 声の一覧・再生・削除UI
- `PodcastForm.vue`: 台本入力・声選択・BGMアップロードUI
- `PodcastPlayer.vue`: プレビュー再生・ダウンロードUI
- `AudioPlayer.vue`: 汎用音声再生コンポーネント

**命名規則**:
- PascalCase + `.vue` 拡張子
- 機能を表す具体的な名称（例: `VoiceRecorder.vue`）

**依存関係**:
- 依存可能: `composables/`, `types/`
- 依存禁止: `server/` 配下のモジュール

#### composables/

**役割**: Composition API の再利用可能なロジック

**配置ファイル**:
- `useVoiceRecorder.ts`: マイク録音ロジック
- `useVoiceList.ts`: 声の一覧管理ロジック
- `usePodcastCreator.ts`: ポッドキャスト生成ロジック
- `useApi.ts`: バックエンドAPI呼び出しの共通ロジック

**命名規則**:
- `use` プレフィックス + camelCase + `.ts`

**依存関係**:
- 依存可能: `types/`, `useApi.ts`（他のcomposable）
- 依存禁止: `server/` 配下のモジュール、Vueコンポーネント

#### types/ (client)

**役割**: フロントエンドで使用する型定義

**配置ファイル**:
- `voice.ts`: Voice関連の型
- `podcast.ts`: Podcast/Job関連の型

**命名規則**:
- kebab-case + `.ts`

### src/server/ (バックエンドディレクトリ - Hono)

#### controllers/

**役割**: HTTPリクエストの受付、バリデーション、レスポンス整形

**配置ファイル**:
- `VoiceController.ts`: 声のCRUD APIエンドポイント
- `PodcastController.ts`: ポッドキャスト生成APIエンドポイント

**命名規則**:
- PascalCase + `Controller.ts`

**依存関係**:
- 依存可能: `services/`, `types/`
- 依存禁止: `repositories/`（データ層への直接アクセス禁止）

#### services/

**役割**: ビジネスロジックの実装

**配置ファイル**:
- `TTSService.ts`: Replicate API経由のTTS音声生成
- `AudioMixer.ts`: ffmpegによるBGM合成・mp3変換

**命名規則**:
- PascalCase + `Service.ts` または機能名 + `.ts`

**依存関係**:
- 依存可能: `repositories/`, `types/`, 外部SDK（Replicate, fluent-ffmpeg）
- 依存禁止: `controllers/`

#### repositories/

**役割**: データの永続化と取得

**配置ファイル**:
- `VoiceRepository.ts`: 声のメタデータ・音声ファイルの管理

**命名規則**:
- PascalCase + `Repository.ts`

**依存関係**:
- 依存可能: `types/`, Node.js fs モジュール
- 依存禁止: `controllers/`, `services/`

#### types/ (server)

**役割**: バックエンドで使用する型定義

**配置ファイル**:
- `voice.ts`: Voiceエンティティ型
- `podcast.ts`: PodcastJob型、JobStatus型

**命名規則**:
- kebab-case + `.ts`

### tests/ (テストディレクトリ)

#### unit/

**役割**: ユニットテストの配置

**構造**:
```
tests/unit/
└── server/
    ├── services/
    │   ├── TTSService.test.ts
    │   └── AudioMixer.test.ts
    └── repositories/
        └── VoiceRepository.test.ts
```

**命名規則**:
- `[テスト対象ファイル名].test.ts`

#### e2e/

**役割**: Playwright E2Eテストの配置

**構造**:
```
tests/e2e/
├── voice-management.test.ts    # 声の登録・一覧・削除フロー
└── podcast-creation.test.ts    # ポッドキャスト生成フロー
```

**命名規則**:
- kebab-case + `.test.ts`
- ユーザーシナリオ単位でファイル分割

### docs/ (ドキュメントディレクトリ)

**配置ドキュメント**:
- `product-requirements.md`: プロダクト要求定義書
- `functional-design.md`: 機能設計書
- `architecture.md`: 技術仕様書
- `repository-structure.md`: リポジトリ構造定義書（本ドキュメント）
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集
- `ideas/`: アイデア・壁打ちメモ

### data/ (ランタイムデータディレクトリ)

**役割**: アプリケーション実行時に生成されるデータ

**注意**: `.gitignore` に含め、バージョン管理対象外とする

```
data/
├── voices/
│   ├── voices.json        # 声のメタデータ一覧
│   └── {uuid}.webm        # 録音された音声ファイル
├── bgm/
│   └── {uuid}.mp3         # アップロードされたBGMファイル
├── temp/
│   └── {job-uuid}-tts.wav # TTS生成の一時ファイル
└── output/
    └── {job-uuid}.mp3     # 完成したポッドキャスト
```

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| Vueコンポーネント | src/client/components/ | PascalCase.vue | VoiceRecorder.vue |
| Composable | src/client/composables/ | useCamelCase.ts | useVoiceRecorder.ts |
| コントローラー | src/server/controllers/ | PascalCaseController.ts | VoiceController.ts |
| サービス | src/server/services/ | PascalCaseService.ts | TTSService.ts |
| リポジトリ | src/server/repositories/ | PascalCaseRepository.ts | VoiceRepository.ts |
| 型定義 | src/{client,server}/types/ | kebab-case.ts | voice.ts |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | tests/unit/server/{layer}/ | [対象].test.ts | TTSService.test.ts |
| E2Eテスト | tests/e2e/ | [シナリオ].test.ts | voice-management.test.ts |

### 設定ファイル

| ファイル種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| TypeScript設定 | プロジェクトルート | tsconfig.json |
| Vite設定 | プロジェクトルート | vite.config.ts |
| Vitest設定 | プロジェクトルート | vitest.config.ts |
| Playwright設定 | プロジェクトルート | playwright.config.ts |
| 環境変数 | プロジェクトルート | .env |
| 環境変数テンプレート | プロジェクトルート | .env.example |

## 命名規則

### ディレクトリ名
- **レイヤーディレクトリ**: 複数形、kebab-case（例: `controllers/`, `services/`）
- **機能ディレクトリ**: 単数形、kebab-case（例: `voice-management/`）

### ファイル名
- **Vueコンポーネント**: PascalCase（例: `VoiceRecorder.vue`）
- **クラスファイル**: PascalCase + 役割接尾辞（例: `TTSService.ts`）
- **Composable**: `use` + PascalCase（例: `useVoiceRecorder.ts`）
- **型定義ファイル**: kebab-case（例: `voice.ts`）
- **テストファイル**: `[対象].test.ts`

## 依存関係のルール

### レイヤー間の依存

```
フロントエンド（Vue.js）
    ↓ HTTP API
バックエンド コントローラー層
    ↓ (OK)
バックエンド サービス層
    ↓ (OK)
バックエンド データ層
```

**禁止される依存**:
- データ層 → サービス層 (NG)
- データ層 → コントローラー層 (NG)
- サービス層 → コントローラー層 (NG)
- フロントエンド → サーバーモジュールの直接import (NG)

### 循環依存の禁止

モジュール間の循環依存は禁止。共通の型定義は `types/` ディレクトリに配置して解決する。

## スケーリング戦略

### 機能の追加

1. **小規模機能**: 既存ディレクトリにファイル追加
2. **中規模機能**: レイヤー内にサブディレクトリを作成
3. **大規模機能**: `src/server/modules/` として独立モジュール化

### ファイルサイズの管理

- 1ファイル: 300行以下を推奨
- 300-500行: リファクタリングを検討
- 500行以上: 分割を強く推奨

## 除外設定

### .gitignore

```
node_modules/
dist/
data/
.env
*.log
.DS_Store
coverage/
```

### .prettierignore, .eslintignore

```
dist/
node_modules/
data/
.steering/
coverage/
```
