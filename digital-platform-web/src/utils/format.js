export const statusText = {
  normal: '正常',
  risk: '风险',
  paused: '暂停',
  delayed: '延期',
  completed: '完成',
  not_started: '未开始',
  current: '当前阶段',
  not_submitted: '待提交',
  submitted: '已提交',
  confirmed: '已确认',
  returned: '已退回'
};

export const submitModeText = {
  online_form: '在线表单',
  file_upload: '文件上传',
  mixed: '混合',
  tbd: '暂未确定'
};

export const organizationRoleText = {
  general_manager: '总经理',
  system_admin: '系统管理员',
  general_manager_assistant: '总经理助理',
  center_manager: '中心负责人',
  employee: '员工'
};

export const businessDepartmentText = {
  operations_center: '运营中心',
  marketing_center: '营销中心',
  manufacturing_center: '制造中心',
  rd_center: '研发中心'
};

export const projectModeText = {
  self_developed: '自研模式',
  outsourced: '供应链/外包模式'
};

export function formatStatus(value) {
  return statusText[value] || value || '-';
}

export function formatSubmitMode(value) {
  return submitModeText[value] || value || '-';
}

export function formatOrganizationRole(value) {
  return organizationRoleText[value] || value || '-';
}

export function formatBusinessDepartment(value) {
  return businessDepartmentText[value] || value || '-';
}

export function formatProjectMode(value) {
  return projectModeText[value] || value || '-';
}

export function formatRequired(value) {
  return value ? '是' : '建议';
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDepartments(value) {
  if (!value) {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatBusinessDepartment).join('、') : '-';
  }

  return formatBusinessDepartment(value);
}

export function formatUser(user) {
  if (!user) {
    return '-';
  }

  const parts = [
    user.name,
    user.department ? formatBusinessDepartment(user.department) : '',
    user.organizationRole ? formatOrganizationRole(user.organizationRole) : '',
    user.role
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '-';
}

export function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) {
    return '-';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
