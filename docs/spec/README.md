# 製品仕様 (索引)

このアプリは、内部実装としてGitを利用しつつ、非エンジニアのユーザーにGitの概念を意識させない「履歴管理/作業管理」アプリです。

## 参照先

- コンセプト/用語: `docs/spec/01-product.md`
- 管理対象プロジェクト/ブランチポリシー: `docs/spec/02-repo-policy.md`
- 起動/操作フロー: `docs/spec/03-workflows.md`
- 安全性/制限/将来: `docs/spec/04-nonfunctional.md`

## 原則 (抜粋)

- UIに `git/branch/commit/stage` 等の用語を出さない
- 対象ブランチは `main` と `work-*` のみ (それ以外は無視)。`main` が無い場合は例外
- Gitリポジトリで `main` があれば扱える (Git未初期化の場合は「新たなプロジェクトを開始する」で `main` を作る)
