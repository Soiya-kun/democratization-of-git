# 01 ロードマップ

本ファイルは「いつ/どこまで作るか」を定義します。仕様は `docs/spec/README.md` を参照します。

## 0. 前提 (決定事項)

- 対象OS(MVP): Windows 11 を優先 (macOS/Linuxは後続)
- 配布物生成(MVP): Windowsで `.exe` を生成する (NSIS)。macOS向けは将来
- 対象プロジェクト: Gitリポジトリで `main` があるもの (Git未初期化は「新たなプロジェクトを開始する」で `main` を生成)
- ブランチ: `main` + `work-*` のみ。`main` が無い場合は例外
- 作業名: 半角英数字とハイフンのみ
- diff表示: まずは unified diff を `pre` 表示 (Monaco diffはBacklog)
- Terminal: `node-pty` + `xterm.js` (MVPは単一セッション)
- 配布: `electron-builder` を採用 (Windows: NSIS)。MVPは署名・自動更新は後回し

## 0.1 技術検証結果 (Node/TypeScript)

- パス検証: `path.resolve` + `path.relative` でワークスペース内判定が可能
- Git操作:
  - stage: `git.add(file)`
  - unstage: `git.reset(['HEAD', '--', file])`
  - discard(追跡済み): `git.checkout(['--', file])`
  - discard(未追跡): `git.raw(['clean', '-f', '--', file])`
- `git init -b main` で初期ブランチを `main` に固定できる
- 作業完了: `--ff-only` merge + 作業ブランチ削除で実現できる
- 複数 `work-*`: `for-each-ref --sort=-committerdate` で最新を選別できる
- リネーム検知: ステージ済みなら `simple-git status` で `index=R` と `from` を取得できる
- `git diff --no-index` は exit code 1 を例外扱いにするため、未追跡のdiffはMVPでは「ファイル内容表示」とする
- `fs.watch({ recursive: true })` はWindowsでイベント取得できるがノイズが多いのでデバウンス必須

## 1. MVPユーザーフロー

1. フォルダを開く
2. Git未導入なら案内を表示し、履歴機能は無効化する
3. Git未初期化なら「新たなプロジェクトを開始する」
4. 起動時のブランチ補正
   - `main/work-*` 以外なら `main` へ切り替える
5. `work-*` なら作業を再開 / `main` なら main(閲覧専用)として開く
6. ワークが無ければ作業名を付けて開始する
7. 変更一覧 → 変更内容確認 → 含める/含めない/取り消す
8. 「この修正の履歴を保存する」
9. 必要なら「作業を完了する」
10. ターミナルでコマンドを実行

## 2. MVP完了条件 (DoD)

- 「新たなプロジェクトを開始する」で `main` 作成/管理マーク(managed/version)設定/初回履歴作成/`AGENTS.md`/`.gitignore` 生成が完了する
- Git未導入を検出して案内できる
- 初回起動の初期設定(履歴に記録する名前/メール)があり、未設定なら入力を促せる
- main(閲覧専用)のUXがあり、ワーク以外での履歴操作を防止できる
- ワーク作成/再開(最新採用)が動作する
- 起動時に現在ブランチが `main/work-*` 以外なら `main` へ切り替えられる
- main→ワーク再開時にmain上の差分を破棄して切替できる
- 変更一覧/変更内容/履歴保存/作業完了が動作する
- Terminal が起動し入出力できる
- Webプレビューで無効機能が明示される
- インストーラが生成できる
  - Windows: NSISインストーラ(`.exe`)

## 3. マイルストーン

- M0: 現状 (基盤の起動、status/diff、単一Terminal)
- M1: ワークスペース管理 + VS Codeライク骨格
- M2: Gitコア + Windowsインストーラ生成 (MVP) 完成
- M3: Terminal拡張 + 履歴UI拡張
- M4: 品質/署名/自動更新/ドキュメント整備
