# DDD (Domain-Driven Design) 方針

このプロジェクトでは、アプリの中核ロジックをDDDで整理し、Electron/React/Git/PTYといった技術詳細を境界(アダプタ)に押し込める。

## 1. 用語 (ドメイン言語)

ドメイン層では、Git用語ではなくプロダクトの言葉を使う。

- Project (管理対象プロジェクト)
- Work (ワーク/作業)
- History (履歴)

Git用語(`branch/commit/stage`)は `infrastructure` のGitアダプタ内に閉じ込める。

## 2. レイヤ案 (main process)

- `domain/`
  - エンティティ/値オブジェクト、ドメインサービス、ドメインルール
- `application/`
  - ユースケース(例: `StartProject`, `StartWork`, `ResumeWork`, `SaveHistory`, `CompleteWork`)
- `infrastructure/`
  - Git/FS/Store/PTYなどの実装詳細 (simple-git, node-pty, fs, electron-store等)
- `presentation/`
  - IPCハンドラ、preload公開API、DTO変換

## 3. Renderer側

- Rendererは「状態表示とユーザー操作」に集中し、ロジックは可能な限りmain側ユースケースへ寄せる
- Webプレビューでは `window.api` が無いため、No-op/スタブで説明的にフォールバックする

## 4. IPCの考え方

- IPCは「ユースケース呼び出しAPI」として設計し、必要最小限にする
- payloadは `shared/` の型を単一のソースとして使用する

