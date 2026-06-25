## ADDED Requirements

### Requirement: 20260624 workflow documentation

The change SHALL provide a 20260624 workflow document that records the intelligent-manufacturing project flow by the same 8 project stages while preserving finer internal workflow nodes.

#### Scenario: Workflow stages are documented

- **WHEN** the 20260624 workflow document is reviewed
- **THEN** it SHALL describe initiation, solution design, contract signing, detailed design, manufacturing, pre-acceptance, final acceptance, and closeout stages.

#### Scenario: Workflow node details are documented

- **WHEN** a stage section is reviewed
- **THEN** it SHALL record workflow nodes, responsible centers, major YES/NO return paths, process files or outputs, and checklist notes.

### Requirement: 20260624 document ownership planning

The change SHALL provide a 20260624 document ownership planning document that lists stage outputs and identifies ownership, review responsibility, requiredness, optional outputs, and special business-node categories.

#### Scenario: Document ownership table exists

- **WHEN** the 20260624 ownership document is reviewed
- **THEN** it SHALL list stage outputs with document identifier, item or node name, stage, default owner center, default owner role, review or confirmation center, requiredness, optional status, special category, and notes.

#### Scenario: Special nodes are distinguished

- **WHEN** finance, procurement, approval, design-change, handoff, or verification nodes appear in the 20260624 flow
- **THEN** the ownership document SHALL mark them separately from ordinary stage documents.

### Requirement: 20260610 and 20260624 comparison

The change SHALL compare the 20260610 document template baseline with the 20260624 workflow and document ownership interpretation.

#### Scenario: Differences are classified

- **WHEN** the comparison section is reviewed
- **THEN** it SHALL classify differences as added, removed or not present, renamed, moved between stages, changed owner center, changed requiredness, and requiring business confirmation.

#### Scenario: 20260610 template limitation is explicit

- **WHEN** the comparison section is reviewed
- **THEN** it SHALL state that the current `v20260610` 54 document templates must not be used directly as the 20260624 template basis.

### Requirement: Documentation-only boundary

The change SHALL remain limited to documentation and planning and SHALL NOT alter application runtime behavior.

#### Scenario: Runtime template remains unchanged

- **WHEN** this change is completed
- **THEN** backend and frontend runtime code SHALL remain unchanged, and the application SHALL continue using the existing `v20260610` runtime template until a later implementation change explicitly updates it.

#### Scenario: Existing active change is untouched

- **WHEN** this change is completed
- **THEN** `openspec/changes/define-digital-platform-v1` SHALL NOT be modified, completed, or archived by this change.
