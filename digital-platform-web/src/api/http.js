const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor({ code, message, status, details, projectCode, projectId }) {
    super(message || code || 'API request failed');
    this.name = 'ApiError';
    this.code = code || 'API_ERROR';
    this.status = status || 0;
    this.details = details || [];
    this.projectCode = projectCode;
    this.projectId = projectId;
  }
}

function buildUrl(path) {
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path;
}

export function buildApiUrl(path) {
  return buildUrl(path);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(errorBody, status) {
  const error = errorBody?.error || {};
  return new ApiError({
    code: error.code,
    message: error.message,
    status,
    details: error.details,
    projectCode: error.projectCode,
    projectId: error.projectId
  });
}

export function getApiBaseUrlLabel() {
  return configuredBaseUrl || '/api';
}

export async function request(path, options = {}) {
  let response;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(options.headers || {})
  };

  if (!isFormData && !headers['content-type'] && !headers['Content-Type']) {
    headers['content-type'] = 'application/json';
  }

  if (options.authToken) {
    headers.authorization = `Bearer ${options.authToken}`;
  }

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers
    });
  } catch (networkError) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接到后端服务，请检查 API 地址或网络连接。'
    });
  }

  let body;
  try {
    body = await parseResponse(response);
  } catch (parseError) {
    throw new ApiError({
      code: 'PARSE_ERROR',
      message: '服务器响应解析失败，请稍后重试。'
    });
  }

  if (!response.ok) {
    throw toApiError(body, response.status);
  }

  return body?.data ?? body;
}

function parseDownloadFileName(contentDisposition) {
  if (!contentDisposition) {
    return '';
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
  return plainMatch ? plainMatch[1].trim() : '';
}

export async function requestBlob(path, options = {}) {
  let response;
  const headers = {
    ...(options.headers || {})
  };

  if (options.authToken) {
    headers.authorization = `Bearer ${options.authToken}`;
  }

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接到后端服务，请检查 API 地址或网络连接。'
    });
  }

  if (!response.ok) {
    const body = await parseResponse(response);
    throw toApiError(body, response.status);
  }

  return {
    blob: await response.blob(),
    fileName: parseDownloadFileName(response.headers.get('content-disposition'))
  };
}

// 将后端错误的关键信息拼到页面提示里，方便现场直接定位请求失败原因。
function formatDetailedApiError(error, fallbackMessage = '请求失败，请稍后重试。') {
  const parts = [];
  if (error.message) {
    parts.push(error.message);
  }
  if (error.code) {
    parts.push(`code: ${error.code}`);
  }
  if (error.status) {
    parts.push(`HTTP ${error.status}`);
  }
  if (Array.isArray(error.details) && error.details.length > 0) {
    parts.push(`details: ${error.details.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('；') : fallbackMessage;
}

export function toReadableApiError(error) {
  if (!(error instanceof ApiError)) {
    return '请求失败，请稍后重试。';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '请补充项目编号、项目名称、客户和项目经理。';
  }

  if (error.code === 'INVALID_PROJECT_MODE') {
    return '项目模式无效，请选择自研模式或供应链/外包模式。';
  }

  if (error.code === 'INVALID_PARTICIPATING_DEPARTMENT') {
    return '参与部门无效，请从运营中心、营销中心、制造中心、研发中心中选择。';
  }

  if (error.code === 'INVALID_PROJECT_MANAGER_USER_ID') {
    return '项目经理参数无效，请重新选择项目经理。';
  }

  if (error.code === 'PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED') {
    return '项目经理不存在或已禁用，请重新选择。';
  }

  if (error.code === 'PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED') {
    return '项目经理必须是启用的中心负责人或员工。';
  }

  if (error.code === 'FORBIDDEN_OPERATION') {
    return '当前账号无权执行该操作。';
  }

  if (error.code === 'INVALID_APPROVAL_ACTION') {
    return '当前审批动作无效或当前状态不允许该动作。';
  }

  if (error.code === 'INVALID_APPROVAL_COMMENT') {
    return '审批意见或退回原因不能为空。';
  }

  if (error.code === 'PROJECT_APPROVAL_NOT_SUBMITTABLE') {
    return '当前项目或阶段暂不能提交审批。';
  }

  if (error.code === 'PROJECT_APPROVAL_NOT_PENDING') {
    return '当前审批不是待处理状态。';
  }

  if (error.code === 'PROJECT_APPROVAL_NOT_APPROVED') {
    return '当前阶段审批未通过，暂不能推进阶段。';
  }

  if (error.code === 'PROJECT_APPROVAL_FORBIDDEN') {
    return '当前用户无权执行该审批操作。';
  }

  if (error.code === 'PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE') {
    return '当前阶段存在未完成的适用必填资料，不能提交或通过审批。';
  }

  if (error.code === 'PROJECT_CODE_EXISTS') {
    return `项目编号 ${error.projectCode || ''} 已存在，请更换后再提交。`.trim();
  }

  if (error.code === 'PROJECT_CODE_REQUIRED') {
    return '请填写项目编号。';
  }

  if (error.code === 'PROJECT_CODE_GATE_NOT_READY') {
    return '项目编号需在 1.2 多节点审批最终通过、1.3 项目立项通知提交且相关返工清除后填写。';
  }

  if (error.code === 'PROJECT_NOT_FOUND') {
    return '项目不存在或已被删除。';
  }

  if (error.code === 'STAGE_DOCUMENT_NOT_FOUND') {
    return '资料项不存在或不属于当前项目。';
  }

  if (error.code === 'RETURN_REASON_REQUIRED') {
    return '请填写退回原因。';
  }

  if (error.code === 'RETURN_REASON_TOO_LONG') {
    return '退回原因过长，请控制在 1000 字以内。';
  }

  if (error.code === 'NOT_APPLICABLE_REASON_REQUIRED') {
    return '请填写不适用原因。';
  }

  if (error.code === 'NOT_APPLICABLE_REASON_TOO_LONG') {
    return '不适用原因过长，请控制在 1000 字以内。';
  }

  if (error.code === 'INVALID_DOCUMENT_STATUS_TRANSITION') {
    return '当前资料状态不允许执行该操作，请刷新清单后重试。';
  }

  if (error.code === 'DOCUMENT_REVIEW_NOT_REQUIRED') {
    return '该资料提交后即完成，不需要执行审核通过或退回。';
  }

  if (error.code === 'INITIATION_REVIEW_REQUIRES_DEDICATED_ENDPOINT') {
    return '1.2 项目立项审批表需使用专用多节点审批，不能走普通资料确认或退回。';
  }

  if (error.code === 'INITIATION_REVIEW_DOCUMENT_NOT_SUBMITTED') {
    return '请先通过普通资料入口提交 1.2 项目立项审批表。';
  }

  if (error.code === 'INVALID_INITIATION_REVIEW_NODE_STATUS') {
    return '当前 1.2 审批节点不是待审批状态，请刷新后重试。';
  }

  if (error.code === 'INITIATION_REVIEW_PREREQUISITE_NOT_READY') {
    return '商务评价和技术评价均通过后，才能处理总经理审批。';
  }

  if (error.code === 'INITIATION_REVIEW_REWORK_BLOCKED') {
    return '1.1 项目需求表返工未清除，暂不能通过被退回的 1.2 审批节点。';
  }

  if (error.code === 'REVISION_TARGETS_REQUIRED') {
    return '请至少选择 1 个需返工资料。';
  }

  if (error.code === 'DESIGN_CHANGE_TARGETS_REQUIRED') {
    return '请至少选择 1 个设计变更资料。';
  }

  if (error.code === 'INVALID_REVISION_TARGETS') {
    return '返工资料选择不在固定候选范围内，请刷新后重试。';
  }

  if (error.code === 'INVALID_DESIGN_CHANGE_TARGETS') {
    return '设计变更资料只能选择 5.13 到 5.16，请刷新后重试。';
  }

  if (error.code === 'REVISION_TARGET_NOT_APPLICABLE') {
    return '条件未触发或不适用的资料不能作为本次返工目标。';
  }

  if (error.code === 'REVISION_TARGETS_NOT_ALLOWED') {
    return '当前资料退回不允许携带上游返工目标。';
  }

  if (error.code === 'REVISION_RESUBMIT_REQUIRED') {
    return '该资料需先返工重提后才能审核通过或退回。';
  }

  if (error.code === 'REVISION_NOT_REQUIRED') {
    return '该资料当前没有需返工标记。';
  }

  if (error.code === 'REVISION_COMPLETION_NOT_ALLOWED') {
    return '该资料需返工重提并审核确认后完成，不能直接清除返工。';
  }

  if (error.code === 'REVISION_COMPLETION_NOT_READY') {
    return '请先提交或上传返工后的资料，再完成返工。';
  }

  if (error.code === 'INVALID_DOCUMENT_APPLICABILITY_TRANSITION') {
    return '当前资料适用性不允许执行该操作，请刷新清单后重试。';
  }

  if (error.code === 'STAGE_DOCUMENT_NOT_APPLICABLE') {
    return '该资料项已标记为不适用，不能执行该操作。';
  }

  if (error.code === 'INVALID_STAGE_DOCUMENT_ID') {
    return '资料项参数无效，请刷新后重试。';
  }

  if (error.code === 'INVALID_ATTACHMENT_ID') {
    return '附件参数无效，请刷新后重试。';
  }

  if (error.code === 'INVALID_ATTACHMENT_FILE') {
    return '附件文件无效，请选择 1 字节到 50MB 以内的文件。';
  }

  if (error.code === 'ATTACHMENT_NOT_FOUND') {
    return '附件不存在、已删除或不属于当前资料项。';
  }

  if (error.code === 'ATTACHMENT_FILE_MISSING') {
    return '附件记录存在，但后端文件已丢失，请联系管理员处理。';
  }

  if (error.code === 'INVALID_RESPONSIBLE_USER_ID') {
    return '责任人参数无效，请刷新清单后重试。';
  }

  if (error.code === 'RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED') {
    return '责任人不存在或已禁用，请重新选择。';
  }

  if (error.code === 'INVALID_STAGE_DOCUMENT_TASK_STATUS') {
    return '资料任务状态筛选无效，请刷新后重试。';
  }

  if (error.code === 'INVALID_PROJECT_ID') {
    return '项目筛选参数无效，请刷新后重试。';
  }

  if (error.code === 'INVALID_PROJECT_STAGE_ID') {
    return '阶段参数无效，请刷新后重试。';
  }

  if (error.code === 'PROJECT_STAGE_NOT_FOUND') {
    return '阶段不存在或不属于当前项目。';
  }

  if (error.code === 'INVALID_PROJECT_STATUS_FILTER') {
    return '项目状态筛选无效，请刷新后重试。';
  }

  if (error.code === 'INVALID_STAGE_ORDER') {
    return '当前阶段筛选无效，请选择 1 到 8 的阶段序号。';
  }

  if (error.code === 'PROJECT_ALREADY_COMPLETED') {
    return '项目已完成，不能继续推进阶段。';
  }

  if (error.code === 'INVALID_PROJECT_CURRENT_STAGE') {
    return '项目当前阶段状态异常，请刷新后重试或联系管理员。';
  }

  if (error.code === 'INVALID_PROJECT_STAGE_STATE') {
    return '当前阶段状态不允许推进，请刷新后重试。';
  }

  if (error.code === 'INVALID_NEXT_PROJECT_STAGE') {
    return '下一阶段状态异常，不能推进阶段，请联系管理员处理。';
  }

  if (error.code === 'STAGE_ADVANCE_INCOMPLETE_REQUIRED_DOCUMENTS') {
    return '当前阶段仍有缺失的适用必填资料，不能推进阶段。';
  }

  if (error.code === 'STAGE_ADVANCE_CHECKLIST_NOT_INITIALIZED') {
    return '当前阶段资料清单尚未初始化，不能推进阶段，请先执行历史项目资料清单补初始化。';
  }

  if (error.code === 'INVALID_OPERATION_LOG_LIMIT') {
    return '业务日志返回数量参数不正确，请刷新后重试。';
  }

  if (error.code === 'INVALID_CREDENTIALS') {
    return '账号或密码错误。';
  }

  if (error.code === 'USER_DISABLED') {
    return '当前用户已禁用，请联系管理员。';
  }

  if (error.code === 'PLATFORM_ADMIN_REQUIRED') {
    return '当前账号不是平台管理员，不能访问用户管理。';
  }

  if (error.code === 'USER_NOT_FOUND') {
    return '用户不存在或已被删除。';
  }

  if (error.code === 'USER_ACCOUNT_EXISTS') {
    return '账号已存在，请更换后再提交。';
  }

  if (error.code === 'USER_REQUIRED_FIELDS') {
    return '请补充用户账号、姓名、组织角色、岗位和必要密码字段。';
  }

  if (error.code === 'INVALID_ORGANIZATION_ROLE') {
    return '组织角色无效，请重新选择。';
  }

  if (error.code === 'INVALID_DEPARTMENT') {
    return '部门无效：总经理、系统管理员、总经理助理部门必须为空，中心负责人和员工必须选择四个业务部门之一。';
  }

  if (error.code === 'SYSTEM_ADMIN_PLATFORM_ADMIN_REQUIRED') {
    return '系统管理员必须同时具备平台管理员权限。';
  }

  if (error.code === 'PLATFORM_ADMIN_ROLE_REQUIRED') {
    return '平台管理员权限只能授予系统管理员组织角色。';
  }

  if (error.code === 'USER_PASSWORD_REQUIRED') {
    return '请填写新密码。';
  }

  if (error.code === 'USER_FORBIDDEN_FIELD') {
    return '普通编辑不能修改账号或密码，请使用指定操作。';
  }

  if (error.code === 'USER_INVALID_FIELD') {
    return '用户字段格式不正确，请刷新后重试。';
  }

  if (error.code === 'LAST_ENABLED_SYSTEM_ADMIN_REQUIRED') {
    return '系统必须至少保留一个启用的系统管理员且具备平台管理员权限，不能执行该操作。';
  }

  if (error.code === 'DAILY_REPORT_WRITER_REQUIRED') {
    return '当前账号无权填写个人日报。';
  }

  if (error.code === 'INVALID_DAILY_REPORT_ID') {
    return formatDetailedApiError(error, '日报参数无效，请刷新页面后重试。');
  }

  if (error.code === 'INVALID_REPORT_DATE') {
    return formatDetailedApiError(error, '日报日期格式无效，请重新选择日期。');
  }

  if (error.code === 'INVALID_DAILY_REPORT_STATUS') {
    return formatDetailedApiError(error, '日报状态无效，请刷新页面后重试。');
  }

  if (error.code === 'DAILY_REPORT_REQUIRED_FIELDS') {
    return formatDetailedApiError(error, '请补全日报必填字段后再提交。');
  }

  if (error.code === 'DAILY_REPORT_PROJECT_NOT_AVAILABLE') {
    return formatDetailedApiError(error, '当前项目不可用于填写日报，请重新选择项目。');
  }

  if (error.code === 'DAILY_REPORT_DUPLICATE') {
    return formatDetailedApiError(error, '当天该项目已存在日报，请打开已有草稿或日报继续编辑。');
  }

  if (error.code === 'DAILY_REPORT_NOT_FOUND') {
    return formatDetailedApiError(error, '日报不存在、已删除或不属于当前账号。');
  }

  if (error.code === 'DAILY_REPORT_FORBIDDEN') {
    return formatDetailedApiError(error, '当前账号无权操作该日报。');
  }

  if (error.code === 'DAILY_REPORT_DELETE_SUBMITTED') {
    return formatDetailedApiError(error, '已提交日报不能删除。');
  }

  if (error.code === 'DAILY_REPORT_INVALID_ATTACHMENT_FILE') {
    return formatDetailedApiError(error, '日报附件文件无效。');
  }

  if (error.code === 'DAILY_REPORT_ATTACHMENT_NOT_FOUND') {
    return formatDetailedApiError(error, '日报附件不存在或不属于当前日报。');
  }

  if (error.code === 'DAILY_REPORT_ATTACHMENT_FILE_MISSING') {
    return formatDetailedApiError(error, '日报附件记录存在，但后端文件已丢失。');
  }

  if (error.code === 'WEEKLY_REPORT_WRITER_REQUIRED') {
    return '当前账号无权填写个人周报。';
  }

  if (error.code === 'INVALID_WEEKLY_REPORT_WEEK') {
    return '周报周期必须是自然周，开始日期为周一，结束日期为周日。';
  }

  if (error.code === 'WEEKLY_REPORT_REQUIRED_FIELDS') {
    return '请补齐周报工作总结和工作计划的必填字段。';
  }

  if (error.code === 'WEEKLY_REPORT_DUPLICATE') {
    return '该周期已经存在周报，请打开已有周报继续编辑。';
  }

  if (error.code === 'WEEKLY_REPORT_NOT_FOUND') {
    return '周报不存在、已删除或不属于当前账号。';
  }

  if (error.code === 'WEEKLY_REPORT_DELETE_SUBMITTED') {
    return '已提交周报不能删除。';
  }

  if (error.code === 'WEEKLY_REPORT_EVALUATE_SUBMITTED_ONLY') {
    return '只有已提交周报可以发起评分。';
  }

  if (error.code === 'CENTER_SCOPE_FORBIDDEN') {
    return '当前账号不能查看其他中心的中心周报。';
  }

  if (error.code === 'WEEKLY_REST_MODE_MANAGER_REQUIRED') {
    return '当前账号无权管理单双休设置，仅总经理和系统管理员可操作。';
  }

  if (error.code === 'WEEKLY_REPORT_FORBIDDEN') {
    const field = (error.details || []).join('、');
    return field ? `参数无效（${field}），请检查后重试。` : '周报操作被拒绝，请刷新页面后重试。';
  }

  if (error.code === 'UNAUTHENTICATED') {
    return '请先登录后再继续操作。';
  }

  if (error.code === 'NETWORK_ERROR') {
    return error.message;
  }

  return formatDetailedApiError(error);
}
