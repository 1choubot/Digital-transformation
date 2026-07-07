## 1. Planning

- [x] 1.1 Create planning document for initiation responsibility permission alignment.
- [x] 1.2 Create OpenSpec proposal, design, and delta specs for `stage-document-checklist` and `technical-architecture`.

## 2. Backend

- [x] 2.1 Add a dedicated helper for `1.1 / 1.2` initiation online form responsibility management permission.
- [x] 2.2 Use the helper in stage document permission building so `canManageResponsibility` matches the intended rule.
- [x] 2.3 Use the helper in responsibility save/clear repository checks.
- [x] 2.4 Ensure `1.3` returns `canManageResponsibility=false` and cannot be handled as a separately assigned responsibility document.
- [x] 2.5 Keep other stage responsibility permissions unchanged.

## 3. Smoke / Verification

- [x] 3.1 Add API smoke coverage for marketing manager positive `1.1 / 1.2` permission and assignment.
- [x] 3.2 Add API smoke coverage for R&D manager, general manager assistant, and system admin negative `1.1 / 1.2` permission and assignment.
- [x] 3.3 Add API smoke coverage for `1.3 canManageResponsibility=false`.
- [x] 3.4 Add API smoke coverage that assigned responsibility still controls `1.1 / 1.2` online form edit/submit, while unassigned or non-responsible users are rejected.
- [x] 3.5 Run `digital-platform-api` check.
- [x] 3.6 Run `digital-platform-web` build.
- [x] 3.7 Run OpenSpec strict validations.
- [x] 3.8 Browser verify marketing manager can assign `1.1 / 1.2`, R&D manager or assistant cannot assign, and `1.3` has no assignment control.
