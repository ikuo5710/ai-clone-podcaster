# ワークフロー統一の議論（2026-01-31）

## 背景

ステアリングファイル（`.steering/`）とbeads（`bd`）の両方を記録する運用を見直し、どちらかに統一したい。

---

## 1. ステアリング vs beads の比較

### ステアリングファイル（`.steering/`）

**メリット**
- 設計文脈が残る: requirements.md / design.md / tasklist.md の3点セットで「なぜこう作ったか」が構造的に残る
- レビューしやすい: Markdownなので人間が読みやすく、PRレビューやふりかえりに使いやすい
- 実装ガイドとして機能: tasklist.mdが作業中のチェックリストになり、実装の道筋を示す
- スキル連携が整備済み: `steering`スキルでモード切替（計画→実装→検証）が定型化されている

**デメリット**
- セッション横断が弱い: ファイルベースなので、複数セッションにまたがる作業の状態追跡が手動になる
- 依存関係が表現できない: タスク間のブロッカーや依存を構造的に管理できない
- 検索性が低い: 過去の意思決定を探すには`.steering/`配下をgrepするしかない
- 現在.gitignoreで除外中: 履歴がリモートに残らない設定になっている

### beads（`bd`）

**メリット**
- セッション横断に強い: `bd sync`で複数端末・セッション間で状態が同期される
- 依存関係・ブロッカー管理: `bd dep add`で構造的にタスク間の依存を表現できる
- 検索・フィルタが充実: `bd ready`, `bd blocked`, `bd search`などで状態ベースの絞り込みが可能
- コンパクション耐性: セッションが圧縮されてもコンテキストを`bd show`で復元できる
- 構造化されたイベント記録: DECISION / ROOT CAUSE / BLOCKER などのコメントで意思決定が追跡可能

**デメリット**
- 設計ドキュメントの置き場がない: notes/descriptionフィールドはあるが、design.mdのような長文の設計文書には向かない
- 可読性がステアリングより劣る: JSONLベースなので、人間が直接ファイルを読むには不向き
- タスクリストとしてのUXが弱い: チェックリスト的な進捗管理はステアリングのtasklist.mdの方が直感的
- ブランチ運用に注意が必要: `.beads/`をmainに混ぜない運用ルールが必要

---

## 2. 提案: GitHub Issue + beads（ステアリング廃止）

### 役割分担
- **GitHub Issue**: 設計文書・議論の場（「何を作るか」）
- **GitHub PR**: コードレビュー、Issueとの自動リンク（`Closes #8`）
- **beads**: 作業状態の管理（「今どこまで進んだか」）
- **ステアリング**: 廃止

### メリット
- 役割が明確に分離される
- 人間のレビューがGitHubに集約される
- 設計文書の可視性が上がる（.gitignoreで除外されていたステアリングと違い、常に見える）
- 二重管理の解消
- beadsの強みが活きる
- GitHubエコシステムとの連携（ラベル、マイルストーン、Projects、CI連携など）

### デメリット
- 作業中のチェックリストが弱くなる（Issueのタスクリスト `- [ ]` で代替）
- steeringスキルの資産が無駄になる
- Issueの粒度設計が必要
- オフライン時にIssueが見えない
- beadsとIssueの紐付けが手動

---

## 3. GitHub Issueのチェックリストとbeadsタスクの1:1対応

### 案: ID命名規則による紐付け

GitHub Issue #8 のチェックリスト項目をbeadsタスクに対応させる際、IDを `{project}_{GitHub Issue ID}_{タスク番号}` とする。

例: `ai-clone-podcaster_8_1`

**メリット**
- IDから文脈が即座にわかる
- 紐付けが命名規則で自動解決
- 粒度が揃う

**デメリット・懸念**
- 採番の手動管理が煩雑（項目追加・削除時のズレ）
- IDが長い
- Issueに紐付かないタスクが例外になる
- チェックリスト更新とbeads closeの二重作業が残る

### beadsの構造機能で代替可能

beadsは以下の構造をネイティブにサポートしている:

- **親子関係**: `bd create --parent <parent-id>`, `bd children <parent-id>`
- **依存関係**: `bd dep add`, `bd dep tree`, `bd blocked`, `bd ready`
- **Epic管理**: `bd epic status`（完了率表示）, `bd epic close-eligible`（自動クローズ）
- **11種以上の依存タイプ**: blocks, tracks, relates-to, discovered-from, until, caused-by, validates, supersedes など
- **Gate**: 非同期待ち条件（人間の承認、GitHub Actions完了、PRマージ待ち等）

→ ID命名規則を工夫しなくても、Epic（親）+ 子タスク + 依存関係で構造を表現できる。

---

## 4. Issueとソースコードの紐付け方法の比較

GitHub Issueを使いたい理由は「Issueとソースコードを紐づけて管理したい」から。

| 方法 | コード紐付け | 設計議論の場 | レビュー | 管理コスト |
|------|------------|------------|---------|-----------|
| A. コミット + beads | `git log --grep` | beadsコメント（短文） | なし | 低 |
| B. PRのみ | PR diff | PR上 | PR上 | 低 |
| C. GitHub Issue + PR | 自動リンク | Issue上 | PR上 | 中 |
| D. ADR + PR | コメント参照 | なし | PR上 | 中 |

---

## 5. 結論

**方針C: GitHub Issue + PR + beads（ステアリング廃止）** を採用。

- **GitHub Issue**: 設計議論・チェックリスト・コードとの自動紐付け
- **GitHub PR**: `Closes #N` でIssue自動クローズ、コードレビュー
- **beads**: Issue内チェックリスト項目に対応する作業状態管理（Epic + 子タスク構造）
- **ステアリング**: 廃止

### 次のステップ（未着手）
1. ステアリング関連の記述をCLAUDE.mdから削除
2. GitHub Issue + PR + beads の運用ルールをCLAUDE.mdに記述
3. steeringスキルの扱いを決める
