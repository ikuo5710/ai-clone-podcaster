# プロジェクトメモリ

## 技術スタック

- Node.js v24.13.0
- TypeScript 5.x
- パッケージマネージャー: npm

## スペック駆動開発の基本原則

### 基本フロー

1. **ドキュメント作成**: 永続ドキュメント(`docs/`)で「何を作るか」を定義
2. **作業計画**: ステアリングファイル(`.steering/`)で「今回何をするか」を計画
3. **実装**: tasklist.mdに従って実装し、進捗を随時更新
4. **検証**: テストと動作確認
5. **更新**: 必要に応じてドキュメント更新

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

#### ステアリングファイル管理

作業ごとに `.steering/[YYYYMMDD]-[タスク名]/` を作成:

- `requirements.md`: 今回の要求内容
- `design.md`: 実装アプローチ
- `tasklist.md`: 具体的なタスクリスト

命名規則: `20250115-add-user-profile` 形式

#### ステアリングファイルの管理

**作業計画・実装・検証時は`steering`スキルを使用してください。**

- **作業計画時**: `Skill('steering')`でモード1(ステアリングファイル作成)
- **実装時**: `Skill('steering')`でモード2(実装とtasklist.md更新管理)
- **検証時**: `Skill('steering')`でモード3(振り返り)

詳細な手順と更新管理のルールはsteeringスキル内に定義されています。

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

### 作業単位のドキュメント(`.steering/`)

特定の開発作業における「今回何をするか」を定義:

- `requirements.md`: 今回の作業の要求内容
- `design.md`: 変更内容の設計
- `tasklist.md`: タスクリスト

### タスクの管理

タスクの実行時は.steeringを作成するが、beadsも並行で記録する。
これは今後beadsに移行することを見据えた試験運用である。

目的：
- 調査・意思決定・ブロッカー・次アクションを beads(bd) に短く記録し、
  個人の複数端末間で `bd sync` により同期する。
- `.beads/*.jsonl` は main/feature に混ぜず、同期は beads-sync に寄せる。

========================
0) 毎回の開始（必須）
========================
1) git をクリーンにする
- 実行: `git status`
- uncommitted changes がある場合は私に「commit / stash が必要」と伝えて止まる

2) beads 同期（取り込み）
- 実行: `bd sync`

========================
1) Issue の作り方（起点）
========================
新しい作業単位は必ず Issue を作る。IDを以後の記録に使う。

- すぐIDが欲しい（推奨）:
  `bd q "<TITLE>"`

- 通常作成:
  `bd create "<TITLE>"`

タイトル例：
- "ai-clone-podcaster: fix episode ordering bug"
- "ai-clone-podcaster: add RSS metadata (itunes)"

========================
2) 着手・進捗更新（固定コマンド）
========================
着手（原子操作で安全）：
- `bd update <ISSUE_ID> --claim`

状態更新：
- `bd update <ISSUE_ID> -s open`
- `bd update <ISSUE_ID> -s in_progress`
- `bd update <ISSUE_ID> -s blocked`（必要なら）
- `bd update <ISSUE_ID> -s closed`（通常は close を使う）

優先度・期限（任意）：
- `bd update <ISSUE_ID> -p P1`
- `bd update <ISSUE_ID> --due "tomorrow"`
- `bd update <ISSUE_ID> --due "+2d"`

メモ追記（短く、要点のみ）：
- `bd update <ISSUE_ID> --append-notes "…"`

========================
3) 作業中に必ず記録するイベント（必須）
========================
以下のイベントが起きたら、必ずコメントで残す（最大5行）。

フォーマット（英語ラベル＋日本語本文）：
- "DECISION: …"
- "ROOT CAUSE: …"
- "BLOCKER: …"
- "LEARNED: …"
- "NEXT: …"

コマンド（固定）：
- `bd comments add <ISSUE_ID> "DECISION: …"`
- `bd comments add <ISSUE_ID> "ROOT CAUSE: …"`
- `bd comments add <ISSUE_ID> "BLOCKER: …"`
- `bd comments add <ISSUE_ID> "LEARNED: …"`
- `bd comments add <ISSUE_ID> "NEXT: …"`

例：
- `bd comments add bd-123 "DECISION: 音声生成はA→Bに変更（品質とコストの均衡）"`
- `bd comments add bd-123 "ROOT CAUSE: feed.xml生成でTZがUTC固定になっていた"`
- `bd comments add bd-123 "NEXT: 1) 修正 2) 回帰テスト 3) リリース"`

========================
4) 完了（固定）
========================
完了は close を使う。理由を必ず残す。

- `bd close <ISSUE_ID> --reason "…"`
便利オプション：
- 次にやるべき候補を出す：`--suggest-next`
- 例：`bd close bd-123 --reason "Fixed + added tests" --suggest-next`

========================
5) ブランチ運用（絶対）
========================
- main/feature ブランチに `.beads/*.jsonl` を混ぜない
- もし混入したら即除外：
  - `git restore --staged .beads`（stage済みの場合）
  - `git restore .beads`（作業ツリーの変更を戻す）
- `.beads/config.yaml` は main に含めてよい（設定共有）

========================
6) 毎回の終了（必須）
========================
1) `git status` を確認（汚れていたら私に確認して止まる）
2) beads を同期（吐き出し）：
   - `bd sync`
3) 可能なら健康チェック：
   - `bd doctor`
   - error があれば具体的な修正手順を提示する

========================
7) 止まって私に確認する条件（ガードレール）
========================
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

**ポイント**: スペック駆動開発の詳細を意識する必要はありません。Claude Codeが適切なスキルを判断してロードします。

## ドキュメント管理の原則

### 永続的ドキュメント(`docs/`)

- 基本設計を記述
- 頻繁に更新されない
- プロジェクト全体の「北極星」

### 作業単位のドキュメント(`.steering/`)

- 特定の作業に特化
- 作業ごとに新規作成
- 履歴として保持