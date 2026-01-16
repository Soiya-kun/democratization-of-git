# Development Plan

このリポジトリの基盤を前提に、VS Codeライクな Git/Shell UI を段階的に実装する計画です。
MVPを優先し、拡張は後続フェーズに分離します。

## 0. 前提/決定 (暫定)

- 対象OS: Windows 11 / macOS 13 を優先、Linuxは後続
- ワークスペース: 単一リポジトリ運用を前提 (複数管理はBacklog)
- diff表示: まずは unified diff を `pre` 表示 (Monaco diffはBacklog)
- 永続化: MRU/設定は `electron-store` 等で保存
- 更新検知: MVPは手動更新 + 軽量監視、重い場合は手動へフォールバック
- Terminal: `node-pty` + `xterm.js` でMVPは単一セッション
- UI方針: VS Codeの配置/操作感を参考にし、ピクセル完全再現はしない
- セキュリティ: すべてのパス入力はワークスペース配下に正規化して検証する
- Git: untrackedはMVPではファイル内容表示を基本とする
- 監視: `fs.watch` を使いつつ、手動更新を必ず残す

## 0.1 技術検証結果 (Node/TypeScriptで確認)

- パス検証は `path.resolve` + `path.relative` でワークスペース内判定が可能 (win32/posixでOK)
- `simple-git` で stage/unstage/discard が実現できることを確認
  - stage: `git.add(file)`
  - unstage: `git.reset(['HEAD', '--', file])`
  - discard(追跡済み): `git.checkout(['--', file])`
  - discard(未追跡): `git.raw(['clean', '-f', '--', file])`
- `git diff --no-index` は差分があると exit code 1 になり `simple-git` では例外扱いになるため、未追跡のdiffはMVPではファイル内容表示とする
- `fs.watch({ recursive: true })` はWindowsでイベント取得を確認 (イベントが多いのでデバウンス必須)

## 1. スコープ/UX (MVP)

### 目的
- Gitの変更確認からコミットまでをGUIで完結
- ShellをUI内で扱える
- Webプレビューでも破綻せず説明的に動作する

### 非目的 (当面)
- IDEレベルの機能 (補完/デバッガ/拡張機構)
- リモート開発、Git認証管理、複雑なリベース/マージUI
- 複数リポジトリの同時管理

### MVPユーザーフロー
1. フォルダを開く
2. Gitリポジトリ検出 → 変更一覧が表示される
3. ファイルを選択してdiffを確認
4. stage/unstage/discard
5. コミットメッセージ入力 → commit 実行
6. ターミナルでコマンドを実行

### MVP完了条件 (DoD)
- リポジトリを開いて状態が表示される
- 変更一覧が分かる (staged/unstaged/untracked)
- diff表示、stage/unstage/discard が動作する
- コミットが実行でき、結果/エラーが表示される
- Terminal が起動し入出力できる
- Webプレビューで無効機能が明示される

## 2. マイルストーン

- M0: 現状 (基盤の起動、status/diff、単一Terminal)
- M1: ワークスペース管理 + VS Codeライク骨格
- M2: Gitコア (MVP) 完成
- M3: Terminal拡張 + Git拡張の一部
- M4: 品質/配布/ドキュメント整備

## 3. アーキテクチャ/IPC設計

### 目的
- IPCの最小化と型安全化
- Webプレビュー時のフォールバックを明確化

### タスク
- [ ] `shared/` にIPC型定義を追加 (request/response/payload)
- [ ] main側にサービス層 (`workspace`, `git`, `terminal`) を分離
- [ ] preload APIをドメイン別に整理し最小限に集約
- [ ] 例外/失敗時の共通エラー形式を定義
- [ ] Webプレビュー用のNo-op APIをrenderer側で統一
- [ ] IPC経路の入力検証 (パス/引数/オプション)
- [ ] ワークスペース配下判定ユーティリティを共通化 (path.resolve/relative)

### 成果物
- IPC型定義
- API設計の簡易ドキュメント

## 4. ワークスペース管理

### 目的
- 操作対象リポジトリの明示化と切替

### タスク
- [ ] フォルダ選択ダイアログ (open)
- [ ] Gitリポジトリ検出 (ルート探索/トップレベル取得)
- [ ] `simple-git` のインスタンスをワークスペースに紐付け
- [ ] MRU (最近使用) 保存と復元
- [ ] 変更監視トリガー (手動/自動)
- [ ] `fs.watch` のイベントをデバウンスしてステータス再取得
- [ ] ステータスバーにワークスペース/ブランチ表示

### 成果物
- ワークスペース切替UI
- ステータス更新フロー

## 5. VS Codeライク骨格

### 目的
- Activity Bar / Side Bar / Editor / Panel / Status Bar の基礎レイアウト

### タスク
- [ ] App shellとレイアウト分割
- [ ] View切替 (Source Control / Terminal / Settings)
- [ ] Editor領域にdiffビューを配置
- [ ] Panel領域にTerminalを配置
- [ ] 基本テーマトークン (色/余白/タイポ)
- [ ] Webプレビュー時のバナー/無効表示統一
- [ ] 空状態/読み込み状態/エラー状態のUI整備

### 成果物
- レイアウトとビュー構成
- テーマ変数

## 6. Gitコア (MVP)

### 目的
- 変更確認からコミットまでをUIで完結

### タスク
- [ ] 変更一覧の区分 (staged/unstaged/untracked/conflicted)
- [ ] diff表示 (選択ファイル / ステージ別)
- [ ] untrackedはファイル内容表示 (MVP)
- [ ] stage/unstage/discard (個別/一括)
- [ ] コミットメッセージ入力とcommit実行
- [ ] 実行結果/エラー通知
- [ ] 危険操作 (discard) の確認UI
- [ ] 変更操作後のステータス再取得

### 成果物
- 基本Git操作UI
- 主要IPC実装

## 7. Git拡張

### 目的
- 開発に必要な最低限のブランチ/履歴操作

### タスク
- [ ] ブランチ一覧と切替
- [ ] ブランチ作成 (from current)
- [ ] 履歴表示 (log)
- [ ] ファイル履歴
- [ ] stash (optional)

### 成果物
- ブランチ/履歴UI

## 8. Terminal拡張

### 目的
- 実運用に耐えるターミナル体験

### タスク
- [ ] 複数セッション/タブ
- [ ] リサイズ同期 (ResizeObserver)
- [ ] 再起動/終了/タイトル変更
- [ ] クイックアクション (git status など)
- [ ] ターミナル状態の復旧方針 (再生成/終了通知)

### 成果物
- ターミナル管理UI
- 安定したPTYライフサイクル

## 9. 設定/永続化

### 目的
- UI設定とワークスペース情報の保持

### タスク
- [ ] MRU保存 (パス/最終利用時刻)
- [ ] UI設定 (テーマ/フォントサイズ/ターミナル設定)
- [ ] 設定ビューの追加 (MVP後半でOK)

### 成果物
- 設定ストレージ
- 設定UI (必要最低限)

## 10. 品質/配布/ドキュメント

### 目的
- 安定性と配布性の担保

### タスク
- [ ] エラー表示/ログ整理 (UI通知 + console)
- [ ] テスト (renderer unit + main service)
- [ ] パフォーマンス確認 (大きめrepo)
- [ ] ビルド/配布 (electron-builder等)
- [ ] README更新 (開発/運用)

### 成果物
- テスト/ビルド体制
- ドキュメント更新

## 11. リスクと対策

- 大規模repoでdiff/一覧が重い → キャッシュ/遅延読み込み/仮想スクロール
- ファイル監視が重い → 監視を最小にし手動更新へフォールバック
- 破壊的操作の誤実行 → 確認UIとUndo候補の提示
- Terminalのリソース肥大化 → scrollback制限と終了処理の徹底
- IPCの肥大化 → ドメイン別APIで最小限に維持

## 12. 先送りリスト (Backlog)

- 複数リポジトリ管理
- LFS/サブモジュール表示
- Monaco diff 統合
- マージ/リベース/コンフリクト解決UI
- 拡張機構/設定同期
- コマンドパレット/キーバインド管理
