export const nodeStatusText = { not_started: '未开始', pending: '待提交', pending_review: '待审批', pending_general_review: '待总经理审批', returned: '已退回', approved: '已通过', skipped: '已跳过', ended: '已结束' };
export function formatDateTime(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false }); }
export function formatFileSize(size) { const value = Number(size); if (!Number.isFinite(value)) return '-'; if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 ** 2).toFixed(1)} MB`; }
export function formatUser(user) { return user?.name || user?.displayName || user?.account || '-'; }
