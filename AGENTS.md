# Agent guidelines

## Project overview
- Electron + React + TypeScript + Vite (electron-vite) workspace inspired by VS Code.
- Renderer can also run as a web preview (no Git/Shell IPC available).

## Commands to run during code changes
- Install dependencies: `npm install`
- Start Electron app: `npm run dev`
- Start web preview (renderer only): `npm run dev:web`
- Build all targets: `npm run build`

## Development notes
- Keep Electron IPC surface area minimal and typed via the preload bridge.
- When adding renderer features, ensure they degrade gracefully in web preview mode (no `window.api`).
- Update README when commands or developer workflow change.

## Docs
- Product spec: `docs/spec/README.md` (entrypoint: `SPEC.md`)
- Dev plan: `docs/plan/README.md` (entrypoint: `PLAN.md`)
- Architecture (DDD): `docs/architecture/ddd.md`

## Architecture (DDD)
- Adopt Domain-Driven Design (DDD) for core logic.
- Suggested layers (main process): `domain` (entities/value objects), `application` (use-cases), `infrastructure` (git/pty/fs/store adapters), `presentation` (IPC/preload boundary).
- Keep domain rules independent of Electron/React; treat IPC as an adapter boundary.
- Use the product language in the domain (e.g. Work/History/Project) and keep Git terms inside infrastructure adapters.

## 作りたいモノ

- gitをUIによって操作・差分チェックするための何らかの仕組み（IDEに搭載されている画面操作のイメージ）
- shellを実行できる仕組み（これもIDEに搭載されている画面操作のイメージ）
- typescript + react + electron(+ 可能ならVITE)のアーキテクチャ
- visual studio codeを特に参考にすること
