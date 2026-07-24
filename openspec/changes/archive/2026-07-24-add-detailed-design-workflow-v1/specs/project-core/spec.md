## ADDED Requirements

### Requirement: Detailed Design Workflow Main Process
The system MUST provide a dedicated detailed design workflow for stage 4 `detailedDesign`, and this workflow MUST be the only main process entry for the detailed design stage.

#### Scenario: Normal detailed design flow advances automatically
- **WHEN** a project enters `detailedDesign`
- **THEN** the system MUST initialize detailed design workflow nodes in this order: `project_kickoff_meeting`, `detailed_design_preparation`, `detailed_design`, `internal_design_review`, `customer_design_review`, `product_plan_drawing`, `parts_list`, `drawing_review`, `customer_drawing_countersign`
- **AND** the project MUST start at `project_kickoff_meeting`
- **AND** each node MUST activate only after its required predecessor is complete
- **AND** completing `customer_drawing_countersign` MUST call the unified stage advance logic and move the project to existing stage key `manufacturing`

#### Scenario: Detailed design workflow is the single main entry
- **WHEN** the backend builds workspace or navigation for stage `detailedDesign`
- **THEN** the stage nodes MUST come from the detailed design workflow DTO
- **AND** the backend MUST NOT return v20260629 blue modules as parallel detailed design main nodes
- **AND** old blueprint node keys MAY be used only as compatibility aliases or redirects to workflow nodes

#### Scenario: Detailed design execution is driven by workflow state
- **WHEN** stage 4 execution is evaluated for node completion, permissions, workbench todos, stage gates, or automatic advance
- **THEN** the backend MUST use detailed design workflow DTO and backend workflow state as the authoritative source
- **AND** ordinary checklist state MUST NOT be used as the execution source
- **AND** old blueprint nodes and C25-C41 ordinary cards MUST NOT become a second execution entry

#### Scenario: Ordinary document cards cannot bypass detailed design workflow
- **WHEN** an ordinary stage document API or ordinary document card attempts to write a detailed design workflow-owned main-process document
- **THEN** the system MUST reject the write or redirect the user to the detailed design workflow entry
- **AND** the ordinary document API MUST only expose compatibility, archive, derived completion, or traceability views for those documents
- **AND** users MUST NOT be able to bypass project kickoff book upload, role assignment, 8-file completeness, design review forms, drawing review, customer countersign, or stage gate through ordinary document cards

#### Scenario: Project kickoff book upload
- **WHEN** the manufacturing center manager uploads the project kickoff book at `project_kickoff_meeting`
- **THEN** the system MUST store the current file and revision
- **AND** the `project_kickoff_meeting` node MUST remain processable until the manufacturing center manager submits the node
- **AND** submitting the node after the current file exists MUST complete `project_kickoff_meeting`
- **AND** the system MUST then activate `detailed_design_preparation`
- **AND** C25 / `4.1`, if reused, MUST represent only the detailed design project kickoff book

### Requirement: Detailed Design Role Assignment and Permissions
The system MUST enforce detailed design workflow permissions using assigned workflow roles and dynamic organization center manager checks.

#### Scenario: Detailed design preparation assigns roles
- **WHEN** the detailed design workflow is at `detailed_design_preparation`
- **THEN** only the research and development center manager MUST be allowed to assign project manager, business owner, technical owner, procurement owner, finance accountant, drawing review owner, and professional group members
- **AND** professional group members MUST be stored only for daily report and weekly report reservation
- **AND** professional group members MUST NOT receive detailed design workflow main action permissions

#### Scenario: Project manager uploads work plan
- **WHEN** the assigned project manager uploads the detailed design work plan
- **THEN** the system MUST store it as the current file for `detailed_design_preparation`
- **AND** the node MUST remain processable until required role assignment is complete, the current work plan exists, and the assigned project manager submits the node
- **AND** node submission MUST activate `detailed_design`

#### Scenario: Wrong role write operation is rejected
- **WHEN** a user who is not the permitted role for a detailed design workflow action attempts that action
- **THEN** the system MUST reject the request with a forbidden or workflow business error
- **AND** the system MUST NOT change node status, upload slot status, review status, generated file status, or stage state

#### Scenario: Ended project write operation is rejected
- **WHEN** a project status is ended
- **THEN** every detailed design workflow write operation MUST be rejected
- **AND** read-only DTO, file history, generated file status, and operation logs MAY still be returned

### Requirement: Detailed Design Files and Design Reviews
The system MUST model detailed design files and design review forms as detailed design workflow state, not as ordinary independent main process cards.

#### Scenario: Eight detailed design files gate the detailed design node
- **WHEN** the technical owner uploads current files for 3D 模型, 电气原理图, 电气接线图, 电气布置图, 自动化程序, 软件开发说明文档, 软件 UI 界面设计 PPT, and 软件代码
- **THEN** the upload action MUST store or replace current files without completing `detailed_design`
- **AND** the `detailed_design` node MUST complete only when all 8 slots have current files or allowed no-upload marks valid for the current revision and the technical owner submits the node
- **AND** the system MUST allow documents, compressed archives, engineering files, source code, and program package files subject to configured size and security validation
- **AND** the system MUST NOT assume these 8 slots are the old consecutive C27-C35 set

#### Scenario: Detailed design file no-upload marks
- **WHEN** the technical owner marks one of C27-C30 or C32-C35 as no-upload at `detailed_design`
- **THEN** the mark MAY satisfy that slot for detailed design node submission
- **AND** no-upload MUST NOT be allowed for C25, C26, C38, C39, or C41
- **AND** a slot with an existing current file MUST NOT be marked no-upload
- **AND** canceling the no-upload mark MUST make the slot block node submission again until a current file is uploaded or it is marked no-upload again

#### Scenario: Internal design review form is generated and approved
- **WHEN** the technical owner submits the internal design review online form
- **THEN** the system MUST generate a file from `D:\Digital transformation\智能制造项目管理文件模板\设计评审记录表-模板.xlsx`
- **AND** the generated file's design implementation plan rows MUST contain only implementation plan text prefixed as `目标N：`, `风险N：`, or `建议N：`
- **AND** those rows MUST NOT repeat the original target, risk, or suggestion content before the plan text
- **AND** the `internal_design_review` node MUST enter research and development center manager approval
- **AND** approval by the research and development center manager MUST complete the node and activate `customer_design_review`

#### Scenario: Customer design review form is generated and approved
- **WHEN** the technical owner submits the customer design review online form
- **THEN** the system MUST generate a file from the same design review template
- **AND** the generated file's design implementation plan rows MUST contain only implementation plan text prefixed as `目标N：`, `风险N：`, or `建议N：`
- **AND** those rows MUST NOT repeat the original target, risk, or suggestion content before the plan text
- **AND** the `customer_design_review` node MUST enter research and development center manager approval
- **AND** approval by the research and development center manager MUST complete the node and activate `product_plan_drawing`

#### Scenario: Design review returned to detailed design
- **WHEN** the research and development center manager returns either internal design review or customer design review
- **THEN** the system MUST return the workflow to `detailed_design`
- **AND** the current detailed design file revision MUST no longer satisfy the returned review until the required detailed design rework is resubmitted
- **AND** downstream nodes MUST be reset or blocked according to the new revision

#### Scenario: Design review return opens a new detailed design revision
- **WHEN** the research and development center manager returns internal design review or customer design review
- **THEN** the workflow MUST open a new detailed design revision
- **AND** the technical owner MUST re-upload the 8 detailed design files for the new detailed design revision
- **AND** old revision files MAY remain traceable or downloadable but MUST NOT satisfy the new revision gate
- **AND** the previously returned review form or generated file MUST NOT satisfy the new revision

### Requirement: Drawing Review Two-Step State
The system MUST model internal drawing review with separate drawing reviewer and research and development center manager substates.

#### Scenario: Drawing reviewer can download current drawing inputs
- **WHEN** the workflow is at `drawing_review`
- **THEN** the drawing review owner MUST be able to download the current product plan drawing and current parts list
- **AND** other users MUST only download files according to DTO permissions

#### Scenario: Drawing review passes with no issue
- **WHEN** the drawing review owner finds no issue and clicks pass
- **THEN** the system MUST NOT require a drawing review record upload
- **AND** the workflow MUST enter research and development center manager approval for drawing review

#### Scenario: Drawing review cannot return without record
- **WHEN** the drawing review owner finds an issue but has not uploaded a drawing review record for the current review cycle
- **THEN** the system MUST reject the return action
- **AND** the blocking reason MUST indicate that the drawing review record must be uploaded before return

#### Scenario: Drawing review no issue and no history does not block
- **WHEN** the drawing review owner finds no issue and no drawing review record history exists for the current project
- **THEN** the system MUST allow pass without requiring a drawing review record upload
- **AND** the workflow MUST continue to research and development center manager approval

#### Scenario: Drawing review returns after record upload
- **WHEN** the drawing review owner uploads a drawing review record and clicks return
- **THEN** the record MUST be retained in drawing review history
- **AND** the workflow MUST return to `product_plan_drawing`
- **AND** the following product plan drawing and parts list nodes MUST be explicitly resubmitted before later review
- **AND** the resubmitted drawing review flow MUST record the C38/C39 current file revisions used as that cycle's inputs

#### Scenario: Rework passes without repeated record upload
- **WHEN** a drawing review record exists from an earlier failed cycle and the reworked drawing review has no issue
- **THEN** the drawing review owner MUST be able to pass without uploading another record
- **AND** the historical drawing review record MUST remain downloadable

#### Scenario: Research and development center manager approval downloads depend on record history
- **WHEN** the workflow is waiting for research and development center manager approval in `drawing_review`
- **THEN** the research and development center manager MUST be able to download current product plan drawing and current parts list
- **AND** if any drawing review record history exists, the research and development center manager MUST also be able to download the historical or current effective drawing review records
- **AND** if no drawing review record history exists, drawing review records MUST NOT be required for approval

#### Scenario: C31 compatibility item does not block detailed design workflow
- **WHEN** C31 / `4.7` control logic flow chart appears in compatibility or archive views
- **THEN** it MUST be treated as a non-workflow compatibility item or archived reference
- **AND** it MUST NOT block detailed design workflow completion or stage advance
- **AND** it MUST NOT appear as an actionable main-process node

#### Scenario: Research and development center manager returns drawing review
- **WHEN** the research and development center manager returns the drawing review approval
- **THEN** the workflow MUST return to `product_plan_drawing`
- **AND** subsequent product plan drawing, parts list, and drawing review states MUST use a new drawing revision
- **AND** C38/C39 submission readiness MUST be based on whether their current files exist, not whether their file revisions are greater than or equal to the new drawing revision
- **AND** the system MUST record only approval action, result, actor, time, and reason without generating an additional approval record form

#### Scenario: Product plan drawing and parts list require explicit submission
- **WHEN** the technical owner uploads C38 product plan drawing
- **THEN** the upload action MUST store the current file without activating `parts_list`
- **AND** submitting `product_plan_drawing` after a current file exists MUST complete the node and activate `parts_list`
- **WHEN** the technical owner uploads C39 parts list
- **THEN** the upload action MUST store the current file without activating `drawing_review`
- **AND** submitting `parts_list` after both C38 and C39 current files exist MUST complete the node and initialize or refresh drawing review flow
- **AND** drawing review flow initialization MUST record the C38/C39 current file revisions used for traceability

### Requirement: Detailed Design Stage Gate and Workbench
The system MUST integrate detailed design workflow with stage gate, automatic advance, and workbench todos.

#### Scenario: Manual stage advance is blocked until workflow completion
- **WHEN** a user attempts manual `advanceProjectStage` while detailed design workflow has not completed `customer_drawing_countersign`
- **THEN** the system MUST reject the advance
- **AND** the gate details MUST include an explicit detailed design workflow blocking reason

#### Scenario: Customer drawing countersign advances to manufacturing
- **WHEN** the business owner uploads the customer countersigned drawing scan at `customer_drawing_countersign`
- **THEN** the upload action MUST store the current file without completing the node
- **AND** the node MUST complete only when the business owner submits it after C41 exists
- **AND** C41 submit readiness MUST be based on current file presence, not on `file revision >= node revision`
- **AND** a drawing rework that raises the customer countersign node revision MUST NOT prevent the first uploaded C41 current file from enabling submit
- **AND** the system MUST call unified automatic stage advance after node submission
- **AND** the project MUST enter existing production stage `manufacturing`
- **AND** the system MUST NOT add an extra approval node that was not requested

#### Scenario: Upload-class submit button is visible but conditionally disabled
- **WHEN** the responsible role opens an actionable upload-class node such as project kickoff, preparation, detailed design files, product plan drawing, parts list, or customer drawing countersign
- **THEN** the workflow DTO MUST expose submit-button visibility for that role even when required files or role assignment are incomplete
- **AND** `canSubmit` MUST remain false until the submit gate is actually satisfied
- **AND** the DTO MUST include submit blocking reasons that the frontend can display next to or inside the disabled submit action

#### Scenario: Detailed design workflow workbench todos
- **WHEN** a user has actionable detailed design workflow permissions in the DTO
- **THEN** the workbench MUST include a `detailed_design_workflow` todo for that action
- **AND** todos MUST cover manufacturing center manager project kickoff book upload, research and development center manager role assignment and approvals, project manager work plan upload, technical owner uploads and review forms, drawing review owner review actions, and business owner customer countersign upload
- **AND** ended projects MUST NOT generate detailed design workflow todos
