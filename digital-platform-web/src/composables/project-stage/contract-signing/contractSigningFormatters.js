export const contractNodeStatusText = {
  not_started: '未开始',
  pending: '处理中',
  pending_review: '待审批',
  waiting_general_manager: '待总经理审批',
  returned: '已退回',
  approved: '已完成'
};

export const contractUploadSlotStatusText = {
  pending: '待上传',
  uploaded: '已上传',
  submitted: '待审批',
  approved: '已通过',
  returned: '已退回'
};

export const contractPaymentStatusText = {
  not_started: '未开始',
  pending: '待处理',
  completed: '已完成支付',
  waiting_general_manager: '等待总经理审批预付款放行',
  released: '总经理已放行'
};

export function contractNodeStatusTagType(status) {
  return {
    approved: 'success',
    pending_review: 'warning',
    waiting_general_manager: 'warning',
    returned: 'danger',
    not_started: 'info'
  }[status] || 'primary';
}

export function contractSlotStatusTagType(status) {
  return {
    approved: 'success',
    submitted: 'warning',
    uploaded: 'warning',
    returned: 'danger',
    pending: 'info'
  }[status] || 'info';
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('zh-CN', { hour12: false });
}

export function formatFileSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export function formatUser(user) {
  return user?.name || user?.displayName || user?.account || '-';
}
