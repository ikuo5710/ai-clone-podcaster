# 開発ガイドライン (Development Guidelines)

## コーディング規約

### 命名規則

#### 変数・関数

```typescript
// 変数: camelCase、名詞または名詞句
const voiceList = fetchVoices();
const selectedVoiceId = 'uuid-here';
const bgmVolume = 0.3;

// 関数: camelCase、動詞で始める
function fetchVoices(): Promise<Voice[]> { }
function createPodcast(options: CreatePodcastOptions): Promise<PodcastJob> { }
function validateLabel(label: string): void { }

// Boolean: is, has, should, can で始める
const isRecording = false;
const hasVoices = true;
const canGenerate = selectedVoiceId !== '';

// 定数: UPPER_SNAKE_CASE
const MAX_VOICE_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BGM_FILE_SIZE = 100 * 1024 * 1024;  // 100MB
const DEFAULT_BGM_VOLUME = 0.3;
```

#### クラス・インターフェース

```typescript
// クラス: PascalCase + 役割接尾辞
class VoiceController { }
class TTSService { }
class VoiceRepository { }
class AudioMixer { }

// インターフェース: PascalCase
interface Voice { }
interface PodcastJob { }

// 型エイリアス: PascalCase
type JobStatus = 'pending' | 'tts_processing' | 'mixing' | 'completed' | 'failed';
```

#### Vueコンポーネント・Composable

```typescript
// コンポーネント: PascalCase.vue
// VoiceRecorder.vue, PodcastForm.vue

// Composable: use + PascalCase
function useVoiceRecorder() { }
function usePodcastCreator() { }
```

### コードフォーマット

**インデント**: 2スペース

**行の長さ**: 最大100文字

**ツール設定**:
- Prettier でフォーマット統一
- ESLint + @typescript-eslint で静的解析

### コメント規約

**関数・クラスのドキュメント（TSDoc）**:
```typescript
/**
 * Replicate APIを使用してTTS音声を生成する
 *
 * @param script - 台本テキスト
 * @param voiceFilePath - クローン元の声ファイルパス
 * @returns 生成された音声のBuffer
 * @throws {Error} APIリクエスト失敗時
 */
async function generateSpeech(script: string, voiceFilePath: string): Promise<Buffer> {
  // 実装
}
```

**インラインコメント**:
```typescript
// ✅ 良い例: なぜそうするかを説明
// BGM音量をTTS音声より低く設定し、聞き取りやすさを確保
const bgmVolumeFilter = `volume=${bgmVolume * 0.5}`;

// ❌ 悪い例: コードの内容を繰り返すだけ
// 音量を設定する
const bgmVolumeFilter = `volume=${bgmVolume * 0.5}`;
```

### エラーハンドリング

**カスタムエラークラス**:
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id: string
  ) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
```

**エラーハンドリングパターン**:
```typescript
// コントローラー層: HonoのエラーハンドラでHTTPレスポンスに変換
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message, field: err.field }, 400);
  } else if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  } else {
    console.error('予期しないエラー:', err);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});
```

## Git運用ルール

### ブランチ戦略

**個人プロジェクトのため簡略化した運用**:

```
main (安定版)
├── feature/[機能名]    # 新機能開発
├── fix/[修正内容]      # バグ修正
└── refactor/[対象]     # リファクタリング
```

- **main**: 動作確認済みの安定したコード
- **feature/fix/refactor**: mainから分岐し、作業完了後にmainへマージ

### コミットメッセージ規約

**Conventional Commits**:

```
<type>(<scope>): <subject>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド、補助ツール等

**Scope例**: `voice`, `podcast`, `tts`, `mixer`, `ui`

**例**:
```
feat(voice): 声の録音・保存機能を追加
fix(tts): Replicate API タイムアウト時のエラーハンドリングを修正
test(mixer): AudioMixer のBGM合成テストを追加
```

## テスト戦略

### テストの種類

#### ユニットテスト（Vitest）

**対象**: サービス層、リポジトリ層、バリデーション

**カバレッジ目標**: サービス層80%以上

**構造（Given-When-Then）**:
```typescript
describe('TTSService', () => {
  describe('generateSpeech', () => {
    it('正常な台本と声で音声を生成できる', async () => {
      // Given
      const service = new TTSService(mockReplicateClient);
      const script = 'テスト台本です';
      const voicePath = '/data/voices/test.webm';

      // When
      const result = await service.generateSpeech(script, voicePath);

      // Then
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('空の台本でValidationErrorをスローする', async () => {
      // Given
      const service = new TTSService(mockReplicateClient);

      // When/Then
      await expect(
        service.generateSpeech('', '/data/voices/test.webm')
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

#### E2Eテスト（Playwright）

**対象**: ユーザーシナリオ全体

**シナリオ**:
1. 声の管理フロー: 録音 → 保存 → 一覧表示 → 試聴 → 削除
2. ポッドキャスト生成フロー: 台本入力 → 声選択 → 生成 → ダウンロード

**モック**: Replicate APIはモックサーバーで代替

### テスト命名規則

**パターン**: 日本語で「[条件]の場合、[期待結果]」

```typescript
it('正常なデータでタスクを作成できる', () => { });
it('ラベルが空の場合ValidationErrorをスローする', () => { });
it('存在しないIDの場合NotFoundErrorをスローする', () => { });
```

### モック・スタブの使用

**原則**:
- 外部依存（Replicate API、ffmpeg、ファイルシステム）はモック化
- ビジネスロジックは実装を使用

```typescript
// Replicate APIのモック
const mockReplicateClient = {
  run: vi.fn().mockResolvedValue(mockAudioBuffer),
};

// ffmpegのモック
vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn().mockReturnValue({
    input: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    save: vi.fn().mockImplementation((path, callback) => callback(null)),
  }),
}));
```

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] PRDの要件を満たしているか
- [ ] エッジケースが考慮されているか
- [ ] エラーハンドリングが適切か

**可読性**:
- [ ] 命名が明確か
- [ ] 複雑なロジックにコメントがあるか

**保守性**:
- [ ] レイヤー間の依存関係ルールが守られているか
- [ ] 重複コードがないか

**セキュリティ**:
- [ ] APIキーがフロントエンドに露出していないか
- [ ] ファイルパスにユーザー入力が直接使用されていないか
- [ ] 入力バリデーションが実装されているか

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | v24.13.0 | https://nodejs.org/ |
| npm | 11.x | Node.jsに同梱 |
| ffmpeg | 最新版 | OS別パッケージマネージャー |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd ai-clone-podcaster

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env
# .env ファイルを編集し、REPLICATE_API_TOKEN を設定

# 4. ffmpegのインストール確認
ffmpeg -version

# 5. 開発サーバーの起動
npm run dev
```

### npm scripts

```json
{
  "dev": "開発サーバー起動（フロントエンド + バックエンド）",
  "build": "本番ビルド",
  "lint": "ESLintによる静的解析",
  "format": "Prettierによるフォーマット",
  "typecheck": "TypeScript型チェック（tsc --noEmit）",
  "test": "Vitestによるユニットテスト実行",
  "test:e2e": "Playwrightによるe2eテスト実行"
}
```

## 自動化

### Pre-commit フック（Husky + lint-staged）

コミット前に自動で以下を実行:
- ESLint（対象ファイルのみ）
- Prettier（対象ファイルのみ）
- TypeScript型チェック

### CI/CD（GitHub Actions）

PRおよびpush時に自動で以下を実行:
1. `npm ci` - 依存関係インストール
2. `npm run lint` - Lintチェック
3. `npm run typecheck` - 型チェック
4. `npm run test` - ユニットテスト
5. `npm run build` - ビルド確認
