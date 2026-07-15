## Context

### Current Implementation Inventory

| Area | Current fact |
| --- | --- |
| C18 carrier | `C18 报价单` currently maps to the solution design `quotation_file` upload slot. The slot key is `SOLUTION_DESIGN_UPLOAD_SLOT_KEY.QUOTATION_FILE` and belongs to the `quotation_or_tender` node. |
| Node activation | The quotation/tender node is activated after finance cost estimation passes general manager approval. `approveFinanceCostByGeneralManager()` sets `quotation_or_tender` from `not_started` or `returned` to `pending`. |
| Branch selection | General manager selects `quotation` or `tender` while the quotation/tender node is `pending`; the selected branch stores `branch_type`, `branch_status=selected`, `revision`, and selected user/time in `project_solution_design_quotation_tender_flows`. |
| Quotation submit | `submitSolutionDesignQuotation()` requires business owner, current quotation branch, `branch_status=selected`, and a current `quotation_file` upload whose revision is at least the node current revision. It then sets flow `branch_status=submitted`, marks the upload slot submitted, and logs submission. |
| Quotation result | Business owner processes quotation result. Accepted quotation approves the quotation/tender node, sets flow `branch_status=accepted`, writes ready-for-contract log, and triggers auto stage advance. Rejected quotation either returns to RD cost or ends the project. |
| C18 completion | Stage document derivation currently treats C18 as complete only when the quotation path is accepted and the current revision has a `quotation_file` upload. |
| Download | `getSolutionDesignUploadDownload()` downloads the current upload file from the slot. C05/C15/C16 generated files use a separate generated-file readiness and storage-readable pattern. |
| Reusable docx generation | `renderDocxTemplate()` already supports Word table cell mapping, generated table rows, and text replacement. `generatedFileRepository.js` already uses it for `.docx` stage document generated files. |

### Template Inventory

Template file read: `D:\Digital transformation\智能制造项目管理文件模板\报价单-模板.docx`.

Office lock files such as `~$报价单-模板.docx` are ignored.

The template has no `MERGEFIELD`, `{{ }}`, `${ }`, `FORMTEXT`, or content-control placeholders. The file does contain Word bookmarks, but they are not meaningful field names for direct mapping. Field mapping therefore needs to target Word text/table positions.

Visible template structure:

| Template position | Visible text / structure | Proposed field |
| --- | --- | --- |
| Paragraph 1 | `TO：            先生/女士` | `recipientName` plus optional `recipientTitle` |
| Paragraph 2 | Fixed introduction text | Keep template text fixed |
| Table 0 row 0 | Headers: 序号、项目、单位、数量、单价、金额、备注 | Fixed headers |
| Table 0 rows 1-9 | Empty item rows | `items[]` with `name`, `unit`, `quantity`, `unitPrice`, generated `amount`, `remark`; `sequence` generated |
| Table 0 row 10 | `大写` and `总金额` | `totalAmountUppercase`, `totalAmount` |
| Paragraphs 78-81 | Fixed notes: 30-day validity, tax/freight included, phone contact | Fixed template text |
| Paragraph 82 | `联系人：           电话` | `contactName`, `contactPhone` |
| Paragraph 84 | Company name | Fixed template text |
| Paragraph 85 | `2026年7月10日` | Optional `quotationDate`; default to submit date when empty |

## Proposed Design

### Behavior

The quotation branch should replace “upload a Word/Excel quotation file” with “fill an online quotation form and generate the Word quotation file”.

The quotation/tender node remains the same node. The general manager still selects the quotation branch at the current stage in the current node. This change does not move branch selection to the finance cost node.

When the selected branch is quotation:

1. The quotation node exposes a quotation online form DTO and permissions.
2. The business owner can save a draft while the quotation branch is current and processable.
3. The business owner submits the quotation form.
4. Submit validates required fields and renders `报价单-模板.docx`.
5. The generated `.docx` is written to solution-design generated storage.
6. Only after generation succeeds does the system mark the quotation branch submitted and treat C18 as submitted for the current revision.
7. Download returns the generated `.docx` and validates storage readability.
8. After the quotation branch is selected, the system does not expose quotation_file as an operable upload entry and the backend rejects new quotation_file uploads for the quotation branch with a clear business error.

### Data Shape

Implementation can choose either a dedicated quotation form table or a JSON-backed form row, but the first implementation should prefer a dedicated solution-design quotation form structure if it needs generated file status, revision, submit metadata, and failure metadata similar to C05/C15/C16.

Recommended logical fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `recipientName` | string | yes | Maps to `TO` line and stores the recipient person name. |
| `recipientTitle` | enum/string | no | Selectable title, such as `先生` or `女士`; default may remain `先生/女士` when empty. |
| `items` | array | yes | At least one item. |
| `items[].name` | string | yes | Maps to 项目 column. |
| `items[].unit` | string | no | Maps to 单位 column. |
| `items[].quantity` | decimal/string | yes | Backend normalizes to a non-negative decimal with up to 4 decimal places for amount calculation. |
| `items[].unitPrice` | decimal/string | yes | Backend normalizes to a non-negative RMB amount with 2 decimal places. |
| `items[].amount` | decimal/string | generated | Backend calculates `quantity * unitPrice`, rounds each line half-up to 2 decimal places, and ignores or rejects frontend-provided amount. |
| `items[].remark` | string | no | Maps to 备注 column. |
| `totalAmount` | decimal/string | generated | Backend sums rounded line amounts and outputs a 2-decimal RMB total. |
| `totalAmountUppercase` | string | generated | Backend calculates RMB uppercase amount from the final 2-decimal `totalAmount`. |
| `contactName` | string | yes | Maps to 联系人. |
| `contactPhone` | string | yes | Maps to 电话. |
| `quotationDate` | date | no | Optional; defaults to submit date when empty. |

### Mapping Completeness

The mapping is complete for the confirmed visible template text and table positions:

- `TO` stores a person name.
- `先生/女士` is selectable.
- Line item `金额`, `总金额`, and `大写` are backend-calculated.
- Amount precision is fixed: quantity supports up to 4 decimal places; unit price, line amount, and total amount use 2 decimal places.
- Rounding is fixed: each line amount is calculated as `quantity * unitPrice` and rounded half-up to 2 decimal places before total summing; the final total is the sum of rounded line amounts; RMB uppercase amount is generated from that final total.
- The frontend may add detail rows; the backend generates dynamic Word table rows as needed.
- `quotationDate` is optional and defaults to submit date when empty.
- Company name and notes remain fixed template text.

### Current Artifact Rule

For the quotation branch, the C18 quotation form generated file is the only current submission, download, and completion source. The implementation must not expose `quotation_file` as an operable upload entry after the quotation branch is selected. The backend must reject new `quotation_file` uploads for the quotation branch with a clear business error, and must not treat `quotation_file` uploads as satisfying the new quotation branch submit gate, generated-file download, C18 completion, or stage advance gate. Old `quotation_file` test upload data is not migrated and is not given a compatibility path in this change.

### Permissions

Reuse existing quotation branch permissions:

- General manager selects quotation/tender branch.
- Business owner edits and submits quotation form for the current quotation branch.
- Business owner processes quotation result after quotation submit.
- Existing project visibility rules continue to control read/download access.

Do not introduce a global permission resolver as part of this change.

### Generated File

Use `.docx` output with MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

Prefer reusing `renderDocxTemplate()` and existing OOXML package update helpers. The implementation should add mapping/building logic near solution-design generated file modules instead of duplicating a separate Word renderer.

Generation failure must leave the quotation form unsubmitted or in a failed generated-file state that blocks C18 completion and quotation result processing. It must return a clear business error and must not expose a stale generated file as current.

### Explicit Non-Goals

- Do not adjust quotation/tender selection timing.
- Do not adjust return-to-RD-cost or precise rework semantics.
- Do not implement or alter contract signing stage business.
- Do not change 8 stages or 71 documents.
- Do not remove tender upload slots.
- Do not add compatibility or migration for old `quotation_file` test uploads.
- Do not change C05/C15/C16 generated file behavior.

## Risks

- Changing C18 completion from upload file to generated file can accidentally allow stage advance before generation succeeds.
- Reusing the old upload slot status would create contradictory DTO states; implementation must make the generated quotation form status authoritative for the quotation branch.
- `.docx` template has no named placeholders; table position mapping may break if the template changes.
- Amount calculation, rounding, and RMB uppercase amount formatting are business-sensitive and require regression tests.
- Dynamic Word table row generation must preserve the template header, total row, fixed notes, company name, and date layout.

## Rollback Strategy

If implementation causes behavior differences, revert the quotation online form change before deployment or restore the prior branch in code review. No data migration is planned for old `quotation_file` test uploads, so rollback must not depend on converting old uploads into quotation form records.
