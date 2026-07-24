export const DETAILED_DESIGN_WORKBENCH_TODO_TYPE = 'detailed_design_workflow';

export const DETAILED_DESIGN_WORKBENCH_STATUS_LABELS = Object.freeze({
  not_started: '未开始',
  pending: '待处理',
  pending_review: '待审批',
  waiting_checker: '待图纸审查',
  waiting_rd_approval: '待研发审批',
  returned: '已退回',
  approved: '已通过'
});

const WORKBENCH_TODO_TYPE_LABELS = {
  document_responsibility: '待我填写资料',
  document_review: '待我评价/审批',
  initiation_review: '待我评价/审批',
  solution_design_workflow: '方案设计待办',
  contract_signing_workflow: '合同签订待办',
  detailed_design_workflow: '详细设计待办'
};

export function formatWorkbenchTodoType(type, item = null) {
  if (type === 'document_responsibility' && item?.revisionRequired) {
    return '待我填写资料';
  }

  return WORKBENCH_TODO_TYPE_LABELS[type] || type || '-';
}

export function isDetailedDesignWorkbenchTodo(item) {
  return item?.type === DETAILED_DESIGN_WORKBENCH_TODO_TYPE || item?.taskType === DETAILED_DESIGN_WORKBENCH_TODO_TYPE;
}

export function formatDetailedDesignWorkbenchStatus(status) {
  return DETAILED_DESIGN_WORKBENCH_STATUS_LABELS[status] || status || '-';
}
