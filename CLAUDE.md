# プロジェクトメモリ

## 技術スタック

- Node.js v24.13.0
- TypeScript 5.x
- パッケージマネージャー: npm

## 開発の基本原則

### 基本フロー

1. **要件定義**: GitHub Issue で「何を作るか」を定義・議論
2. **作業管理**: beads でタスクの状態・依存関係を管理
3. **実装**: Issue のチェックリストに従って実装
4. **レビュー**: GitHub PR でコードレビュー（`Closes #N` でIssue自動クローズ）
5. **検証**: テストと動作確認

### 重要なルール

#### ドキュメント作成時

**1ファイルずつ作成し、必ずユーザーの承認を得てから次に進む**

承認待ちの際は、明確に伝える:
```
「[ドキュメント名]の作成が完了しました。内容を確認してください。
承認いただけたら次のドキュメントに進みます。」
```

#### 実装前の確認

新しい実装を始める前に、必ず以下を確認:

1. CLAUDE.mdを読む
2. 関連する永続ドキュメント(`docs/`)を読む
3. Grepで既存の類似実装を検索
4. 既存パターンを理解してから実装開始

## ディレクトリ構造

### 永続的ドキュメント(`docs/`)

アプリケーション全体の「何を作るか」「どう作るか」を定義:

#### 下書き・アイデア（`docs/ideas/`）
- 壁打ち・ブレインストーミングの成果物
- 技術調査メモ
- 自由形式（構造化は最小限）
- `/setup-project`実行時に自動的に読み込まれる

#### 正式版ドキュメント
- **product-requirements.md** - プロダクト要求定義書
- **functional-design.md** - 機能設計書
- **architecture.md** - 技術仕様書
- **repository-structure.md** - リポジトリ構造定義書
- **development-guidelines.md** - 開発ガイドライン
- **glossary.md** - ユビキタス言語定義

### タスクの管理

作業管理は beads（bd）で行う。GitHub Issue と beads を連携させて運用する。

- GitHub Issue 1件 → beads Epic 1件（親）
- Issue内のチェックリスト項目 → beads 子タスク（`--parent` で紐付け）
- beads Epic の description に GitHub Issue URL を記載して相互参照
- コミットメッセージに `#N`（GitHub Issue番号）を含める
- PRの description に `Closes #N` を含め、マージ時にIssue自動クローズ

#### GitHub Issue の起票ルール

新しい作業単位は GitHub Issue を起点とする。

1. GitHub Issue を作成（設計・要件・チェックリスト `- [ ]` を記載）
2. beads に Epic を作成し、description に Issue URL を記載:
   `bd create --title="GH#N: タイトル" --type=epic --description="https://github.com/ikuo5710/ai-clone-podcaster/issues/N"`
3. Issue 内のチェックリスト項目ごとに beads 子タスクを作成:
   `bd create --title="タスク名" --type=task --parent=<EPIC_ID>`
4. 必要に応じてタスク間の依存を設定:
   `bd dep add <後続タスク> <先行タスク>`

#### beads 運用ルール

**セッション開始時（必須）:**
1. `git status` で作業ツリーを確認（汚れていたら commit / stash が必要と伝えて止まる）
2. `bd sync` で beads を同期

**作業中:**
- 着手: `bd update <ID> --status=in_progress`
- 意思決定やブロッカーはコメントで記録:
  - `bd comments add <ID> "DECISION: …"`
  - `bd comments add <ID> "ROOT CAUSE: …"`
  - `bd comments add <ID> "BLOCKER: …"`
  - `bd comments add <ID> "LEARNED: …"`
  - `bd comments add <ID> "NEXT: …"`
- 完了: `bd close <ID> --reason "…"` し、対応する GitHub Issue のチェックリスト項目を `- [x]` に更新する（`gh issue edit` で body を更新）

**コミット・PR:**
- コミットメッセージに `#N`（GitHub Issue番号）を含める
- PR description に `Closes #N` を含める

**セッション終了時（必須）:**
1. `git status` を確認（汚れていたら確認して止まる）
2. `bd sync` で beads を同期
3. 可能なら `bd doctor` で健康チェック

**ブランチ運用:**
- main/feature ブランチに `.beads/*.jsonl` を混ぜない
- 混入したら即除外: `git restore --staged .beads`
- `.beads/config.yaml` は main に含めてよい

**ガードレール（止まって確認する条件）:**
- `bd sync` 中に rebase/merge/conflict が出た
- `git status` が汚れているのに `bd sync` が必要になった
- `.beads/*.jsonl` が main/feature に混入した
- `bd doctor` が Sync Divergence を繰り返し検出する


## 開発プロセス

### 初回セットアップ

1. このテンプレートを使用
2. `/setup-project` で永続的ドキュメント作成(対話的に6つ作成)
3. `/add-feature [機能]` で機能実装

### 日常的な使い方

**基本は普通に会話で依頼してください:**

```bash
# ドキュメントの編集
> PRDに新機能を追加してください
> architecture.mdのパフォーマンス要件を見直して
> glossary.mdに新しいドメイン用語を追加

# 機能追加(定型フローはコマンド)
> /add-feature ユーザープロフィール編集

# 詳細レビュー(詳細なレポートが必要なとき)
> /review-docs docs/product-requirements.md
```

## ドキュメント管理の原則

### 永続的ドキュメント(`docs/`)

- 基本設計を記述
- 頻繁に更新されない
- プロジェクト全体の「北極星」