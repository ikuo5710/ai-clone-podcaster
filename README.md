# AI Clone Podcaster

自分の声のクローンを使ってポッドキャストを生成するWebアプリケーション。

ブラウザ上で声を録音・登録し、台本テキストを入力するだけで、自分の声で読み上げたポッドキャスト音声（MP3）を生成できます。BGMのミキシングにも対応。

## 主な機能

- **ボイス管理** - ブラウザのマイクで声を録音し、クローン用の声として登録・管理
- **ポッドキャスト生成** - 台本テキスト + 登録済みの声で TTS 音声を生成
- **BGM ミキシング** - BGM ファイルをアップロードし、音量を調整して合成
- **MP3 ダウンロード** - 生成されたポッドキャストを MP3 でダウンロード

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Vue.js 3 (Composition API) + Vite |
| バックエンド | Hono + Node.js |
| TTS エンジン | Replicate API (qwen3-tts) |
| 音声処理 | ffmpeg (fluent-ffmpeg) |
| 言語 | TypeScript 5.x |
| テスト | Vitest + Playwright |

## 前提条件

- Node.js v24 以上
- npm
- ffmpeg（システムにインストール済みであること）
- [Replicate](https://replicate.com/) の API トークン

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env に Replicate API トークンを記入

# ビルド
npm run build

# サーバー起動（http://localhost:3000）
npm run dev
```

開発時はフロントエンドの HMR を使う場合：

```bash
# ターミナル1: バックエンド
npm run dev:server

# ターミナル2: フロントエンド（http://localhost:5173）
npm run dev:client
```

## npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run build` | サーバー・クライアント両方をビルド |
| `npm run dev` | サーバーをウォッチモードで起動 |
| `npm run dev:server` | サーバーのみ起動 |
| `npm run dev:client` | Vite 開発サーバーのみ起動 |
| `npm run lint` | ESLint によるリント |
| `npm run format` | Prettier によるフォーマット |
| `npm run typecheck` | 型チェック |
| `npm test` | ユニットテスト実行 |
| `npm run test:coverage` | カバレッジ付きテスト |

## プロジェクト構成

```
src/
├── client/                # Vue.js フロントエンド
│   ├── components/        # UI コンポーネント
│   ├── composables/       # ロジック（API 通信、録音、ポーリング）
│   └── types/             # 型定義
└── server/                # Hono バックエンド
    ├── controllers/       # HTTP エンドポイント
    ├── services/          # ビジネスロジック（TTS、音声ミキシング）
    ├── repositories/      # データ永続化
    └── types/             # 型定義・エラー型
tests/
├── unit/                  # Vitest ユニットテスト
└── e2e/                   # Playwright E2E テスト
docs/                      # 設計ドキュメント（PRD、機能設計、アーキテクチャ等）
data/                      # 実行時データ（git-ignored）
```

## 開発手法

本プロジェクトは **SDD（Spec Driven Development）** を採用し、Claude Code を活用して開発しています。

- `docs/` 配下に PRD・機能設計書・アーキテクチャ等の設計ドキュメントを管理
- GitHub Issue で要件を定義し、beads でタスク管理
- 詳細は `CLAUDE.md` を参照

## 参考文献

本プロジェクトは技術評論社より発行されている[「実践Claude Code入門 - 現場で活用するためのAIコーディングの思考法」](https://www.amazon.co.jp/dp/4297153548)をベースにしています。

## ライセンス

MIT