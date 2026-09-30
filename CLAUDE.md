# Paster — Contributor Guidance

Paster converts art-directed Figma compositions into portable, responsive layouts. Keep the code and documentation approachable for human contributors.

## Architecture

- `plugin/`: Figma exporter and UI, bundled with esbuild.
- `packages/core/`: Versioned schema, validation, and geometry. Framework-independent; no Figma or browser dependencies.
- `frontend/react/`: Reusable React renderer using TypeScript and CSS Modules. No Vite dependency.
- `playground/`: Vite playground for JSON/ZIP imports and preview. Its rendered composition must match production markup; keep debug UI in a separate layer (see `docs/architecture.md`).
- Use pnpm workspaces and TypeScript throughout.

Terminology: **Composition → Layout (breakpoint) → Item**. In Figma, a Layout is a Frame node; an Item is not necessarily one (it's whatever visual content — currently an image or SVG — sits inside a layout).

Items have `x`, `y`, `width`, `height`, and `zIndex`. Keep geometry separate from assets and content. Support data-driven breakpoints with independent geometry, stacking, and image overrides.

## Build

- Source belongs in `src/`; generated output belongs in ignored `dist/` directories.
- Never manually edit or commit generated files.
- The plugin build must generate everything referenced by its Figma manifest.
- Run relevant builds and tests before completing a milestone.
- CI must verify builds and tests on pushes and pull requests.

## Code quality

- Prefer clear names, small functions, and simple solutions over speculative abstractions.
- Comment why, not what. Avoid redundant comments, boilerplate JSDoc, and development-history comments.
- Remove obsolete comments and temporary TODOs.
- Document non-obvious public APIs and constraints.
- Prefer CSS over JavaScript wherever CSS can do the job: layout, responsiveness (media and container queries), visibility, and interaction states. Use JavaScript only for what CSS can't express, and keep any CSS generated at runtime to the minimum that has to be data-driven.
- Prioritize accessibility, safe file imports, predictable rendering, and reduced-motion support.
- Never assume Figma metadata provides suitable image alt text.

## Workflow

1. Complete only one milestone from `PLAN.md` per invocation. Never proceed without explicit approval.
2. Inspect existing code before editing. Keep changes focused.
3. Meet acceptance criteria; update tests and documentation as needed.
4. Report changes, affected files, test results, limitations, and a suggested commit message.
5. Stop for manual review. Never stage, commit, push, or create GitHub resources unless explicitly requested.
   
## Documentation

- Keep the README focused on introduction, setup, and basic usage.
- Use `docs/` for architecture, composition format, Figma usage, and technical references.
- Keep documentation aligned with implemented behavior; label planned functionality clearly.
- Update relevant documentation when public APIs, schema, or workflows change.
- Avoid duplicating detailed explanations across files.

Do not mark incomplete milestones as complete. Report blockers and leave unfinished checklist items unchecked.