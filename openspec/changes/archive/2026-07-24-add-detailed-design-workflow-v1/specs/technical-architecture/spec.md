## ADDED Requirements

### Requirement: Detailed Design Workflow Architecture
The technical architecture MUST implement detailed design as a dedicated stage workflow module integrated with repository, DTO, API, navigation, stage gate, workbench, generated files, uploads, downloads, derived completion, and operation logs.

#### Scenario: Dedicated domain and schema
- **WHEN** implementing detailed design workflow
- **THEN** the backend MUST add a detailed design workflow domain defining stage constants, node keys, upload slot keys, role keys, statuses, errors, and permission helpers
- **AND** the backend MUST add formal migrations and schema ensure for detailed design nodes, roles, professional group members, upload slots, upload files, review forms, drawing review records, and drawing review flow state
- **AND** schema ensure MUST match formal migration fields and MUST NOT replace formal migrations

#### Scenario: Repository builds DTO and permissions
- **WHEN** the backend returns detailed design workflow data
- **THEN** the repository MUST initialize missing workflow rows when the project enters or has reached `detailedDesign`
- **AND** the repository MUST build a DTO containing nodes, roles, professional members, upload slots, review forms, drawing review state, permissions, blocking reasons, and isProjectEnded
- **AND** permissions in the DTO MUST be the single source for frontend buttons and workbench todos
- **AND** workflow tables and domain state MUST generate the DTO, which serves as the execution contract for frontend, workbench, and navigation

#### Scenario: API routes follow workflow style
- **WHEN** detailed design workflow APIs are implemented
- **THEN** routes MUST be namespaced under `/api/projects/:projectId/detailed-design-workflow`
- **AND** routes MUST cover read DTO, role assignment, uploads, no-upload marks for eligible 8-file slots, explicit upload-class node submission, downloads, review forms, generated file downloads, drawing review records, drawing review actions, and customer countersign upload
- **AND** routes MUST NOT use generic BPM or generic payment/invoice endpoints

#### Scenario: Generated files reuse existing infrastructure
- **WHEN** internal or customer design review online forms are submitted
- **THEN** generated files MUST use the existing stage document generated file infrastructure or an equivalent shared generated-file service
- **AND** generated file records MUST include project, document or workflow code, template key, version, status, storage key, generated user/time, source hash, source snapshot, template version, and template hash
- **AND** template rendering MUST use `设计评审记录表-模板.xlsx`

#### Scenario: File upload storage supports current file and history
- **WHEN** detailed design workflow files are uploaded
- **THEN** upload tables MUST support revision and current file semantics
- **AND** replacing files after a return MUST mark old current files as replaced or superseded for the affected slot
- **AND** upload actions MUST NOT complete upload-class nodes; explicit submit actions MUST evaluate current files or no-upload marks and advance nodes
- **AND** drawing review record uploads MUST preserve history and MUST NOT be overwritten by a later pass

#### Scenario: Navigation single source
- **WHEN** workspace or navigation data is built for stage `detailedDesign`
- **THEN** backend navigation MUST use detailed design workflow DTO nodes
- **AND** backend navigation MUST NOT return v20260629 blue modules as detailed design main nodes
- **AND** frontend node pages MUST be reached through these backend nodes

#### Scenario: Stage gate uses workflow state
- **WHEN** manual or automatic stage advance checks stage `detailedDesign`
- **THEN** stage advance MUST verify detailed design workflow completion from backend workflow tables
- **AND** the advance gate MUST require customer drawing countersign completion before entering `manufacturing`
- **AND** the gate MUST NOT rely on frontend state, old blueprint nodes, or ordinary C25-C41 card status alone

#### Scenario: Workbench todos use DTO permissions
- **WHEN** building my workbench todos
- **THEN** the backend MUST add detailed design workflow todos from detailed design DTO permissions
- **AND** it MUST NOT duplicate detailed design permission logic in a separate workbench-only implementation
- **AND** todo targetRoute MUST point to `/projects/${projectId}?taskMode=detailedDesign&focusNodeKey=${nodeKey}` or an equivalent project detail node route

#### Scenario: Ordinary document API boundary
- **WHEN** ordinary stage document APIs read detailed design stage documents
- **THEN** they MAY display archive, compatibility, derived completion, and generated file traceability
- **AND** they MUST NOT expose detailed design workflow main actions through ordinary document cards
- **AND** C25 MUST remain detailed design project kickoff book and MUST NOT be linked to contract project kickoff notice
- **AND** the ordinary API MUST remain display-only for compatibility, archive, derived completion, and traceability; it MUST NOT become an execution path for stage 4

#### Scenario: Ordinary document write APIs cannot bypass workflow
- **WHEN** an ordinary document upload, submit, approval, or status-change API targets a detailed design workflow-owned main-process document
- **THEN** the backend MUST reject the request or redirect it to the dedicated detailed design workflow API
- **AND** the ordinary API MUST NOT allow users to bypass project kickoff book upload, role assignment, 8-file completeness, design review forms and approvals, drawing review actions, customer countersign, or stage gate
- **AND** the ordinary API MAY only expose compatibility, archive, derived completion, and traceability data for those items
