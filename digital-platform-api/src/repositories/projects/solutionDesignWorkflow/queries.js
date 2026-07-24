import { ProjectNotFoundError } from '../shared.js';

export async function selectProjectContext(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      p.id,
      p.project_code,
      p.project_name,
      p.customer_name,
      p.status,
      p.project_manager,
      p.project_manager_user_id,
      pm.account AS project_manager_account,
      pm.display_name AS project_manager_display_name,
      pm.department AS project_manager_department,
      pm.organization_role AS project_manager_organization_role,
      pm.role AS project_manager_role,
      pm.is_enabled AS project_manager_is_enabled,
      pm.is_platform_admin AS project_manager_is_platform_admin,
      pm.file_platform_user_id AS project_manager_file_platform_user_id,
      p.business_responsible_user_id,
      br.account AS business_responsible_account,
      br.display_name AS business_responsible_display_name,
      br.department AS business_responsible_department,
      br.organization_role AS business_responsible_organization_role,
      br.role AS business_responsible_role,
      br.is_enabled AS business_responsible_is_enabled,
      br.is_platform_admin AS business_responsible_is_platform_admin,
      br.file_platform_user_id AS business_responsible_file_platform_user_id,
      p.technical_responsible_user_id,
      tr.account AS technical_responsible_account,
      tr.display_name AS technical_responsible_display_name,
      tr.department AS technical_responsible_department,
      tr.organization_role AS technical_responsible_organization_role,
      tr.role AS technical_responsible_role,
      tr.is_enabled AS technical_responsible_is_enabled,
      tr.is_platform_admin AS technical_responsible_is_platform_admin,
      tr.file_platform_user_id AS technical_responsible_file_platform_user_id,
      s.id AS current_stage_id,
      s.stage_order AS current_stage_order,
      s.stage_key AS current_stage_key,
      s.stage_name AS current_stage_name,
      s.stage_status AS current_stage_status
    FROM projects p
    LEFT JOIN users pm
      ON pm.id = p.project_manager_user_id
    LEFT JOIN users br
      ON br.id = p.business_responsible_user_id
    LEFT JOIN users tr
      ON tr.id = p.technical_responsible_user_id
    LEFT JOIN project_stages s
      ON s.project_id = p.id AND s.is_current = 1
    WHERE p.id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  const row = rows[0];
  if (!row) {
    throw new ProjectNotFoundError(projectId);
  }

  return row;
}

export async function selectSolutionDesignRoles(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_roles
    WHERE project_id = ?
    LIMIT 1`,
    [projectId]
  );

  return rows[0] || null;
}

export async function selectSolutionDesignRolesForUpdate(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_roles
    WHERE project_id = ?
    LIMIT 1
    FOR UPDATE`,
    [projectId]
  );

  return rows[0] || null;
}

export async function selectSolutionDesignNodes(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_nodes
    WHERE project_id = ?
    ORDER BY node_order ASC`,
    [projectId]
  );

  return rows;
}

export async function selectSolutionDesignUploadSlots(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      s.*,
      f.id AS current_file_id,
      f.revision AS current_file_revision,
      f.original_file_name AS current_file_original_file_name,
      f.mime_type AS current_file_mime_type,
      f.file_size AS current_file_size,
      f.uploaded_by_user_id AS current_file_uploaded_by_user_id,
      f.uploaded_at AS current_file_uploaded_at,
      u.account AS current_file_uploaded_by_account,
      u.display_name AS current_file_uploaded_by_display_name,
      eu.account AS exempted_by_account,
      eu.display_name AS exempted_by_display_name
    FROM project_solution_design_upload_slots s
    LEFT JOIN project_solution_design_upload_files f
      ON f.slot_id = s.id AND f.is_current = 1
    LEFT JOIN users u
      ON u.id = f.uploaded_by_user_id
    LEFT JOIN users eu
      ON eu.id = s.exempted_by_user_id
    WHERE s.project_id = ?
    ORDER BY s.slot_order ASC`,
    [projectId]
  );

  return rows;
}

export async function selectCurrentAnalysisForm(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_analysis_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
}

export async function selectProjectStageDocumentByCode(executor, projectId, documentCode, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      d.*,
      u.department AS responsible_department,
      u.organization_role AS responsible_organization_role,
      u.role AS responsible_role,
      u.is_enabled AS responsible_is_enabled
    FROM project_stage_documents d
    LEFT JOIN users u
      ON u.id = d.responsible_user_id
    WHERE d.project_id = ?
      AND d.document_code = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, documentCode]
  );

  return rows[0] || null;
}

export async function selectProjectStageDocumentByAnyCode(executor, projectId, documentCodes, { forUpdate = false } = {}) {
  for (const documentCode of documentCodes) {
    const row = await selectProjectStageDocumentByCode(executor, projectId, documentCode, { forUpdate });
    if (row) {
      return row;
    }
  }

  return null;
}

export async function selectCurrentReviewForm(executor, projectId, nodeKey, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.node_key = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId, nodeKey]
  );

  return rows[0] || null;
}

export async function selectCurrentReviewForms(executor, projectId) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_review_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    ORDER BY f.node_key ASC`,
    [projectId]
  );

  return rows;
}

export async function selectCurrentQuotationForm(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT
      f.*,
      submitter.account AS submitted_by_account,
      submitter.display_name AS submitted_by_display_name,
      creator.account AS created_by_account,
      creator.display_name AS created_by_display_name,
      updater.account AS updated_by_account,
      updater.display_name AS updated_by_display_name
    FROM project_solution_design_quotation_forms f
    LEFT JOIN users submitter
      ON submitter.id = f.submitted_by_user_id
    LEFT JOIN users creator
      ON creator.id = f.created_by_user_id
    LEFT JOIN users updater
      ON updater.id = f.updated_by_user_id
    WHERE f.project_id = ?
      AND f.is_current = 1
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
}

export async function selectQuotationTenderFlow(executor, projectId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT *
    FROM project_solution_design_quotation_tender_flows
    WHERE project_id = ?
    LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [projectId]
  );

  return rows[0] || null;
}
