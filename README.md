# democratization-of-git

非エンジニア向けの履歴管理ワークスペースです。内部ではGitを利用しつつ、UIではGit用語を極力見せない設計を目指しています。

## セットアップ

```bash
npm install
```

## 開発起動

Electron版:

```bash
npm run dev
```

Webプレビュー版:

```bash
npm run dev:web
```

## 配布 (Windows)

```bash
npm run dist:win
```

## 構成概要

- `electron/main/index.ts` - メインプロセス起動
- `electron/main/domain` - ドメインルール (Work/Project/History)
- `electron/main/application` - ユースケース (`WorkspaceService`)
- `electron/main/infrastructure` - Git/Settings/Terminal などのアダプタ
- `electron/main/presentation` - IPCハンドラ
- `electron/preload/index.ts` - レンダラに公開するAPIブリッジ
- `shared/ipc.ts` - IPC型定義
- `src/components` - UIコンポーネント

## メモ

- Git操作は `simple-git` を使用しています。
- ターミナルは `node-pty` + `xterm.js` を使用しています。
- 作業フォルダはアプリ内から選択します。
- Webプレビュー版では `window.api` が利用できないため、Git/Shell機能はダミー表示になります。
