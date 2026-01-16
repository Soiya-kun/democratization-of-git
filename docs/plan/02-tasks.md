# 02 タスク分解

本プロジェクトのMVPには「Windows向けインストーラ生成」まで含める (セクション6も必須)。

## 1. アーキテクチャ/IPC設計

- [ ] `shared/` にIPC型定義を追加 (request/response/payload)
- [ ] main側にサービス層 (`workspace`, `history`, `terminal`) を分離
- [ ] preload APIをドメイン別に整理し最小限に集約
- [ ] 例外/失敗時の共通エラー形式を定義
- [ ] Webプレビュー用のNo-op APIをrenderer側で統一
- [ ] IPC経路の入力検証 (パス/引数/オプション)
- [ ] ワークスペース配下判定ユーティリティを共通化 (path.resolve/relative)

## 2. ワークスペース管理

- [ ] フォルダ選択ダイアログ (open)
- [ ] Git未導入の検出と案内 (Git機能は無効化)
- [ ] Gitリポジトリ検出 (ルート探索/トップレベル取得)
- [ ] `main` ブランチ存在確認 (無ければエラー)
- [ ] Git未初期化フォルダの取り扱い
  - [ ] 「新たなプロジェクトを開始する」導線
  - [ ] `git init -b main` + ローカル設定(`user.name/email`, `democratization-of-git.managed=true`, `democratization-of-git.version=1`) + 初回履歴保存 + `AGENTS.md`/`.gitignore` 作成(既存は上書きしない)
- [ ] `simple-git` のインスタンスをワークスペースに紐付け
- [ ] MRU (最近使用) 保存と復元
- [ ] 変更監視トリガー (手動/自動)
- [ ] `fs.watch` のイベントをデバウンスしてステータス再取得
- [ ] ステータスバーにワークスペース/作業名(ワーク)表示 (ブランチ名は非表示)

## 3. VS Codeライク骨格

- [ ] App shellとレイアウト分割 (Activity Bar / Side Bar / Editor / Panel / Status Bar)
- [ ] View切替 (Work/Terminal/Settings)
- [ ] Editor領域に差分/内容ビューを配置
- [ ] Panel領域にTerminalを配置
- [ ] 基本テーマトークン (色/余白/タイポ)
- [ ] Webプレビュー時のバナー/無効表示統一
- [ ] 空状態/読み込み状態/エラー状態のUI整備

## 4. 履歴管理コア (MVP)

- [ ] `main` が無い場合の例外ハンドリング
- [ ] 管理マークの設定 (`democratization-of-git.managed=true`, `democratization-of-git.version=1`, 無ければ設定)
- [ ] 管理対象の `user.name/email` 設定 (未設定なら設定、既存設定は維持)
- [ ] 起動時のブランチ補正
  - [ ] 現在のブランチが `main/work-*` 以外なら `main` へ切り替える
  - [ ] 切替失敗時の案内/復旧導線 (必要なら差分破棄)
- [ ] ワーク開始/再開
  - [ ] `work-*` の検出と、複数ある場合の「最新採用」(committerdate)
  - [ ] 作業名入力のバリデーション (半角英数字/ハイフンのみ)
  - [ ] `work-<作業名>` の作成と切替 (ユーザーにはブランチ非表示)
  - [ ] メイン(閲覧専用)の操作制限と導線
  - [ ] メイン表示中の外部変更検知と導線 (開始/リセット)
  - [ ] メイン→ワークへ戻る(再開)とき、メイン上の差分は破棄してから切替する
- [ ] 変更一覧の区分 (含める/含めない/未追跡/競合)
- [ ] 差分/内容表示 (untrackedは内容表示)
- [ ] 含める/含めない/取り消す (ファイル単位/選択/一括)
- [ ] 「この修正の履歴を保存する」(commit)
- [ ] 「作業を完了する」(自動保存→`--ff-only` merge→main→ワーク削除)

## 5. Terminal拡張

- [ ] 複数セッション/タブ
- [ ] リサイズ同期 (ResizeObserver)
- [ ] 再起動/終了/タイトル変更
- [ ] クイックアクション

## 6. 品質/配布/ドキュメント

- [ ] エラー表示/ログ整理 (UI通知 + console)
- [ ] テスト (renderer unit + main service)
- [ ] パフォーマンス確認 (大きめrepo)
- [ ] 設定保存 (アプリ設定ファイル: `app.getPath('userData')` 配下を想定)
- [ ] 配布方式を `electron-builder` に確定して実装 (Windows: NSIS)
  - [ ] `npm run dist` / `npm run dist:win` 等のスクリプト追加
  - [ ] `electron-builder` 設定追加 (appId/productName/artifactName/files)
  - [ ] ネイティブ依存(`node-pty`)の `install-app-deps` をビルドに組み込む
  - [ ] 署名/SmartScreenは将来(Backlog)とし、MVPでは無署名で配布する
  - [ ] `.exe` の生成手順をドキュメント化
- [ ] README更新

## 7. Backlog (将来)

- [ ] 「クラウドへ保存/クラウドから取得」(remote push/pull) の導線
- [ ] `main` の最新化(取得/同期)の簡易導線
- [ ] 自動では完了できないケース(競合など)の解決UI
- [ ] Monaco diff / 大型差分の快適化
- [ ] macOS向け配布物(DMG)対応
- [ ] 管理外リポジトリの参照/インポート方針の確定
