## 1. Current Cleanup Change

- [x] 1.1 Review `project-core` and `project-core-frontend` for stale `v20260610` / 54-item wording.
- [x] 1.2 Replace project creation wording so new projects initialize 8 stages and `v20260624` 64 stage document items.
- [x] 1.3 Replace `20260610 项目流程依据` with `智能制造项目管理流程图20260624.pdf` and `docs/9.10_v20260624阶段资料模板规划_20260624.md`.
- [x] 1.4 Replace project detail frontend wording so the UI dynamically renders API-returned `v20260624` document data without hard-coded counts.
- [x] 1.5 Document the simple document collection, review, archive, and stage advance loop.
- [x] 1.6 Keep `define-digital-platform-v1` unchanged; note that it needs later splitting or superseding.
- [x] 1.7 Run `cmd /c openspec validate align-simple-document-collection-flow --strict`.
- [x] 1.8 Run `cmd /c openspec validate --all --strict`.

## 2. Explicit Non-Implementation

- [x] 2.1 Do not implement backend logic in this change.
- [x] 2.2 Do not implement frontend logic in this change.
- [x] 2.3 Do not create contract, purchase, payment, invoice, design-change, file-server-check, or random-material-transfer workflow engines.
- [x] 2.4 Do not archive or commit this change before review.

## Roadmap Notes

Later `file-platform-integration` and `online-form` work is intentionally not represented as checkbox tasks in this change. Those items remain roadmap material in `design.md` / `proposal.md` and should be split into separate future changes after review.
