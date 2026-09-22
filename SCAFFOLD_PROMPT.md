# Prompt for Claude — Paster scaffold

You are working on **Paster**, a public TypeScript monorepo for exporting Figma compositions and rendering them responsively. Read `CLAUDE.md` and `PLAN.md` first. If they aren't in the repository yet, use the supplied copies. Follow the architecture and decisions in those files rather than inventing a competing schema.

**Work on exactly one milestone per response. Begin with M0 if the repository has no planning documents; otherwise identify the earliest incomplete milestone, report what you found, and implement only that milestone unless I explicitly specify another.** Do not batch multiple milestones into one change, even if the next one seems quick.

Before editing, inspect the repository and summarize briefly what exists. Implement the selected milestone in the smallest coherent way. Use pnpm, TypeScript, CSS Modules for React/demo, Vite for demo, and esbuild for plugin as indicated in the plan. Keep code framework-independent in `packages/core`. Keep the user-facing model `Composition → Layout → Frame`, allow multiple breakpoints, preserve independent `zIndex`, and keep imagery/assets separate from geometry. Do not create a fake Figma plugin ID or claim tests/manual Figma checks passed unless you actually ran them.

For each milestone:
1. Implement only its checklist and necessary supporting work.
2. Run the applicable install/build/typecheck/tests, reporting exact outcomes and anything untested.
3. Update `PLAN.md` checkboxes **only** for verified items; update README as required.
4. Report the milestone name; files changed; implementation details and decisions; test commands/results; limitations and next review questions; and one suggested conventional-commit message.
5. **STOP. I will review and manually stage/commit.** Do not run `git add`, `git commit`, `git push`, publish packages, create issues, or start the next milestone without an explicit request.

Start with **M0 — Documentation and repository contract**. If the provided `CLAUDE.md` and `PLAN.md` are already in place, complete the remaining M0 acceptance criteria and stop. Do not scaffold packages yet.
