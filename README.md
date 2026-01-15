# democratization-of-git

VS Codeの操作感を意識したGit UI / Shell UIの開発基盤です。Electron + React + TypeScript + Vite (electron-vite) で構成しています。

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

## 構成概要

- `electron/main/index.ts` - メインプロセス。Git情報取得とシェル(PTY)の管理を担当
- `electron/preload/index.ts` - レンダラに公開するAPIブリッジ
- `src/components` - UI (Source Control/Terminal) コンポーネント

## メモ

- Git操作は `simple-git` を使用しています。
- ターミナルは `node-pty` + `xterm.js` を使用しています。
- 起動時のリポジトリ対象は `process.cwd()` です。別のリポジトリを扱う場合は起動ディレクトリを切り替えてください。
- Webプレビュー版では `window.api` が利用できないため、Git/Shell機能はダミー表示になります。
