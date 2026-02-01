---
name: epic-progress
description: GitHub Issue番号からbeads epicとその子タスクの進捗状況を標準出力する
disable-model-invocation: true
allowed-tools: Bash
---

# Epic進捗確認スキル

引数で指定されたGitHub Issue番号に対応するbeads epicとその全子タスクの詳細を表示する。

## 使い方

```
/epic-progress <GitHub Issue番号(数字のみ)>
```

例: `/epic-progress 3`

## 実行手順

1. `bd search "GH#$ARGUMENTS" --json` を実行し、epicを特定する
2. 検索結果からtype=epicのissueを抽出し、そのIDを取得する
3. `bd show <EPIC_ID>` を実行してepic自体の詳細を標準出力する
4. `bd show <EPIC_ID> --children --short` を実行して子要素の一覧を標準出力する
5. 子要素が存在する場合、各子要素に対して `bd show <CHILD_ID>` を実行して詳細を標準出力する
6. 最後にサマリーを出力する:
   - epic タイトル
   - 全子タスク数
   - ステータス別の内訳（open / in_progress / closed）
   - 進捗率（closed / 全体 の百分率）

## 注意事項

- 引数が未指定の場合は「使い方: /epic-progress <Issue番号>」と表示して終了する
- 検索結果にepicが見つからない場合は「GH#N に対応するepicが見つかりません」と表示する
- 子要素がない場合は「子タスクはありません」と表示する
- 全てのbdコマンド出力はそのまま標準出力に表示する（加工しない）
