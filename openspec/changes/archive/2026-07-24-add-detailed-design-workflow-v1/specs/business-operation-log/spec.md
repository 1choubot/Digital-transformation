## ADDED Requirements

### Requirement: Detailed Design Workflow Operation Logs
The system MUST record business operation logs for detailed design workflow actions, state transitions, generated files, returns, approvals, and automatic stage advance.

#### Scenario: Role assignment and upload logs
- **WHEN** detailed design workflow roles are assigned or changed
- **THEN** the system MUST record a detailed design roles assigned log with assigned role users, professional group members, actor, and time
- **AND** uploads for project kickoff book, detailed design work plan, 8 detailed design files, product plan drawing, parts list, drawing review record, and customer countersigned drawing scan MUST each write a log with nodeKey, slotKey, revision, file metadata, actor, and time
- **AND** explicit submit-node actions for upload-class nodes MUST each write a log with nodeKey, revision, actor, submit result, and the next activated node when applicable
- **AND** no-upload and cancel-no-upload actions for eligible detailed design file slots MUST write logs with nodeKey, slotKey, documentCode, revision, actor, and resulting no-upload state

#### Scenario: Design review form logs
- **WHEN** internal or customer design review form is saved, submitted, generated, generation fails, approved, or returned
- **THEN** the system MUST record a detailed design operation log
- **AND** the details MUST include reviewType, nodeKey, revision, generated file metadata when present, reviewer, approval result, comment or return reason, actor, and time

#### Scenario: Drawing review logs
- **WHEN** the drawing review owner uploads a review record, passes, or returns
- **THEN** the system MUST record a drawing review operation log with drawing review substatus, current product plan drawing revision, current parts list revision, record file metadata when present, actor, time, and return reason
- **AND** when the research and development center manager approves or returns drawing review, the system MUST record a separate approval action log
- **AND** the log MUST NOT claim that the research and development center manager generated an approval record form

#### Scenario: Customer countersign and automatic advance logs
- **WHEN** the business owner uploads the customer countersigned drawing scan
- **THEN** the system MUST record a customer drawing countersign upload log
- **AND** if the backend automatically advances from `detailedDesign` to `manufacturing`, the system MUST record an automatic stage advance log
- **AND** the stage advance log details MUST identify the trigger as detailed design customer drawing countersign completion

#### Scenario: Frontend operation log labels
- **WHEN** frontend renders operation logs containing detailed design workflow action types
- **THEN** it MUST show Chinese labels for role assignment, uploads, review form generation, approvals, returns, drawing review actions, customer countersign, and automatic advance trigger
- **AND** it MUST NOT show raw action codes as the normal display
