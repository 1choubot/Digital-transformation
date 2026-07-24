## ADDED Requirements

### Requirement: Detailed Design Workflow Frontend
The frontend MUST render detailed design stage pages from the backend detailed design workflow DTO and MUST NOT locally construct a second set of detailed design nodes.

#### Scenario: Detailed design navigation uses backend workflow nodes
- **WHEN** the project workspace returns stage `detailedDesign`
- **THEN** the frontend MUST display only the detailed design workflow nodes returned by backend workspace/navigation
- **AND** the frontend MUST NOT display v20260629 blue modules as parallel detailed design main nodes
- **AND** old node links MUST either resolve to the corresponding workflow node or show a clear retired-node message

#### Scenario: Node page routing covers all detailed design workflow nodes
- **WHEN** a user opens any detailed design workflow node route
- **THEN** the frontend MUST route to a dedicated page for `project_kickoff_meeting`, `detailed_design_preparation`, `detailed_design`, `internal_design_review`, `customer_design_review`, `product_plan_drawing`, `parts_list`, `drawing_review`, and `customer_drawing_countersign`
- **AND** these nodes MUST NOT fall through to the generic blank node page as the normal path

#### Scenario: Buttons depend only on backend permissions
- **WHEN** the frontend renders detailed design workflow action buttons
- **THEN** upload, submit, approve, return, pass, download, assign, and countersign buttons MUST be shown only when the backend DTO permissions expose the corresponding action
- **AND** the frontend MUST NOT infer detailed design permissions locally from role names, departments, node status, or document codes

#### Scenario: Upload node pages submit explicitly
- **WHEN** a user uploads files on project kickoff, preparation, detailed design, product plan drawing, parts list, or customer countersign pages
- **THEN** the frontend MUST refresh the detailed design workflow DTO without assuming the node advanced
- **AND** the page MUST render a submit-node action when the backend DTO exposes submit visibility for the responsible role
- **AND** the submit action MUST be disabled when `canSubmit` is false
- **AND** the disabled state MUST display backend DTO submit blocking reasons, for example by tooltip or adjacent text
- **AND** successful submit MUST refresh workflow, workspace, navigation, workbench, and current stage before focusing the next active node

#### Scenario: Detailed design upload list is compact and supports no-upload
- **WHEN** the frontend renders the 8-file detailed design upload page
- **THEN** the upload list MUST show upload content, current file name, and actions
- **AND** it MUST NOT show version, uploader, or upload time columns in that compact list
- **AND** C27-C30 and C32-C35 rows MUST show no-upload or cancel-no-upload actions only when the backend DTO exposes those permissions
- **AND** C25, C26, C38, C39, and C41 MUST NOT show no-upload actions

#### Scenario: Detailed design file uploads support real file types
- **WHEN** the technical owner uploads the 8 detailed design files
- **THEN** the frontend MUST allow selecting documents, compressed packages, engineering files, source code, and program package files subject to backend validation
- **AND** client-side validation MUST NOT reject files solely because they are compressed archives or program files

#### Scenario: Design review online form UI
- **WHEN** the user opens internal design review or customer design review
- **THEN** the frontend MUST provide online form editing, submit/generate, generated file status, generated file download, and research and development center manager approval/return controls according to DTO permissions
- **AND** a returned design review MUST visibly indicate that the workflow goes back to detailed design
- **AND** the form MUST use a matrix interaction with target, risk, and suggestion rows, each paired with required implementation plan text before submission

#### Scenario: Drawing review UI shows two substates
- **WHEN** the user opens `drawing_review`
- **THEN** the frontend MUST display drawing reviewer status separately from research and development center manager approval status
- **AND** the drawing review owner MUST see current product plan drawing and parts list download entries when permitted
- **AND** the return action MUST require an uploaded drawing review record when the DTO says one is required
- **AND** the research and development center manager approval area MUST show drawing review record downloads only when history exists

#### Scenario: Customer drawing countersign UI advances stage
- **WHEN** the business owner uploads the customer countersigned drawing scan successfully
- **THEN** the frontend MUST refresh workflow, workspace, navigation, and current stage
- **AND** if the backend advanced to `manufacturing`, the frontend MUST show the new current stage

#### Scenario: Ended projects are read-only
- **WHEN** a project is ended
- **THEN** the frontend MUST hide all detailed design workflow write buttons
- **AND** the frontend MAY still show status, file history, generated file status, and operation logs

### Requirement: Detailed Design Workbench Frontend
The frontend MUST display backend-provided detailed design workflow todos without deriving detailed design permissions locally.

#### Scenario: Workbench shows detailed design todo type
- **WHEN** the workbench API returns items with type `detailed_design_workflow`
- **THEN** the frontend MUST show them as `详细设计待办` or equivalent detailed design workflow tasks
- **AND** the subject MUST display nodeName or nodeKey
- **AND** card clicks MUST use the backend-provided targetRoute

#### Scenario: Workbench supports detailed design statuses
- **WHEN** a detailed design workflow todo has status such as `pending`, `pending_review`, `returned`, `approved`, `waiting_checker`, `waiting_rd_approval`, or equivalent detailed design statuses
- **THEN** the frontend MUST display a readable status label
- **AND** the frontend MUST NOT discard the todo because the status is not a ordinary document status
