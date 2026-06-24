## Context

The application currently initializes 8 project stages and 54 `v20260610` stage document templates. Recent document-access-control work restricts normal employees to their own documents and lets center managers handle "center-related" documents, but that relationship is still inferred mainly from the assigned responsible user's department.

Unassigned documents have no responsible user department. As a result, a center manager cannot see or assign documents that clearly belong to their center by template, such as RD-owned design documents, until someone else assigns a responsible user first.

This change keeps the runtime template set at `v20260610` and adds structured ownership fields to the existing 54 templates and project-level document snapshots.

## Goals / Non-Goals

**Goals:**

- Add nullable `ownerDepartment` and `reviewDepartment` fields to stage document templates and project-level stage documents.
- Store those fields using existing `BUSINESS_DEPARTMENT` constants.
- Populate `v20260610` templates with conservative owner/review department mappings.
- Use `ownerDepartment` to decide whether center managers can view and assign unassigned documents from their center.
- Use `reviewDepartment` to decide whether center managers can review submitted documents and receive `document_review` workbench todos.
- Return the new fields from stage document checklist and workbench APIs.
- Display owner/review departments in project detail and keep buttons controlled by backend permission fields.
- Keep existing restrictions for normal employees, system administrators, and general manager assistants.

**Non-Goals:**

- Do not switch the runtime template version from `v20260610` to `v20260624`.
- Do not import the 20260624 64 direct file outputs into program templates.
- Do not implement invoice, payment, contract review, purchase request, design-change, cost-estimation collaboration, or other 20260624 complex workflow nodes.
- Do not add "unassigned document" todos for center managers.
- Do not modify, complete, or archive `define-digital-platform-v1`.
- Do not archive or commit this change after implementation; leave it for review.

## Decisions

### Store ownership on the project-level document snapshot

Template ownership is useful at initialization time, but permissions are evaluated against project-level documents. The database therefore gets `owner_department` and `review_department` nullable columns on `project_stage_documents`.

New projects write the values from the `v20260610` template snapshot. Existing projects are tolerated when values are null, and schema initialization backfills missing values by matching the existing `template_version` + `document_code` against the current template constants.

### Use template ownership before responsible-user inference

For center-manager document scope, the system will use:

1. `ownerDepartment` for view and responsibility assignment.
2. `reviewDepartment` for submitted-document review and review todos.
3. Responsible user's department only as a compatibility fallback for old rows without structured fields.

This resolves unassigned documents while preserving old simulated data behavior.

The same owner/review-first rule also applies to center-manager project visibility, stage advance eligibility, stage_advance workbench todos, and document applicability operations. `participatingDepartments` remains a project-level center-manager visibility and stage-advance signal. Responsible user's department is only a compatibility fallback when a document has no `ownerDepartment` and no `reviewDepartment`.

### Keep project-manager documents nullable

Project-manager owned planning/closeout documents are not inherently owned by a fixed company center. For `方案设计工作计划`, `详细设计工作计划`, and `项目结题报告`, `ownerDepartment` and `reviewDepartment` stay nullable. Project managers and general managers can still see and manage them through project-level permissions.

### Conservative v20260610 mapping

The mapping follows `docs/9.2_阶段资料清单与责任角色表_20260610.md` and current 20260610 behavior:

- Marketing: customer-facing demand, initiation, sales contract, customer reviews/signoff, acceptance organization, and training record context.
- RD: solution design, detailed design, technical agreement, drawing review, technical notice, work instructions, product manuals, maintenance manuals, and training PPT.
- Manufacturing: project kickoff, purchasing/manufacturing documents, inspection, warehousing, material issue, installation/debug, self-acceptance, pre-acceptance record, delivery note, and final acceptance record.
- Project manager planning/closeout documents: nullable owner/review departments.
- Cost estimation: `ownerDepartment = rd_center`, `reviewDepartment = manufacturing_center` because the current 20260610 flow has RD aggregate estimates and send them to manufacturing. This remains a conservative approximation, not the 20260624 multi-center collaboration model.

### Keep attachment upload narrow

Attachment visibility follows document visibility, but upload remains limited to the assigned responsible user. System administrators and general manager assistants remain excluded from business attachment access, upload, delete, and review permissions.

### Applicability uses center-related document scope

Document applicability is a planning/control action, not a document review action. Center managers can mark not-applicable or restore applicable for documents whose `ownerDepartment` or `reviewDepartment` matches their department. For old rows with both fields null, the implementation falls back to responsible user's department. This does not broaden submit, review, or attachment upload permissions.

## Risks / Trade-offs

- Some 20260610 document ownership is still a business approximation -> Keep nullable fields where ownership is not fixed and document the mapping in template constants.
- Existing rows may have null ownership -> Backfill from current template constants and retain responsible-user fallback for compatibility.
- Cost estimation is cross-center in the real workflow -> Keep the existing conservative mapping and defer richer collaboration to a future 20260624 workflow change.
- Center managers will see more unassigned documents than before -> Scope is limited to `ownerDepartment` or `reviewDepartment` matching their department; normal employees remain restricted to assigned documents.
