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
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接到后端服务，请检查 API 地址或网络连接。'
    });
  }

  const body = await parseResponse(response);

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

export function toReadableApiError(error) {
  if (!(error instanceof ApiError)) {
    return '请求失败，请稍后重试。';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '请补充项目编号、项目名称、客户和项目经理。';
  }

  if (error.code === 'PROJECT_CODE_EXISTS') {
    return `项目编号 ${error.projectCode || ''} 已存在，请更换后再提交。`.trim();
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
    return '请补充用户账号、姓名、部门、角色和必要密码字段。';
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

  if (error.code === 'LAST_ENABLED_PLATFORM_ADMIN_REQUIRED') {
    return '系统必须至少保留一个启用的平台管理员，不能执行该操作。';
  }

  if (error.code === 'UNAUTHENTICATED') {
    return '请先登录后再继续操作。';
  }

  if (error.code === 'NETWORK_ERROR') {
    return error.message;
  }

  return error.message || '请求失败，请稍后重试。';
}
