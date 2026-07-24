import { computed, onBeforeUnmount, watch } from 'vue';
import { useDetailedDesignWorkflow } from './useDetailedDesignWorkflow.js';

export const detailedDesignRoleDefinitions = Object.freeze([
  { roleKey: 'project_manager', label: '项目经理', payloadKey: 'projectManagerUserId' },
  { roleKey: 'business_owner', label: '商务负责人', payloadKey: 'businessOwnerUserId', requiredDepartment: 'marketing_center' },
  { roleKey: 'technical_owner', label: '技术负责人', payloadKey: 'technicalOwnerUserId', requiredDepartment: 'rd_center' },
  { roleKey: 'procurement_owner', label: '采购负责人', payloadKey: 'procurementOwnerUserId', requiredDepartment: 'manufacturing_center' },
  { roleKey: 'finance_accountant', label: '财务会计', payloadKey: 'financeAccountantUserId', requiredDepartment: 'operations_center' },
  { roleKey: 'drawing_review_owner', label: '图纸审查负责人', payloadKey: 'drawingReviewOwnerUserId', requiredDepartment: 'rd_center' },
  { roleKey: 'professional_group_member', label: '专业组成员', payloadKey: 'professionalGroupMemberUserIds', multiple: true }
]);

export function buildDetailedDesignNodeUploadSlots(allSlots, nodeKey) {
  return (Array.isArray(allSlots) ? allSlots : [])
    .filter((slot) => slot.nodeKey === nodeKey)
    .sort((a, b) => Number(a.slotOrder || 0) - Number(b.slotOrder || 0));
}

export function useDetailedDesignNodePage(props, emit) {
  const context = computed(() => props.nodePageContext || {});
  const workflow = computed(() => context.value.detailedDesignWorkflow || null);
  const nodeKey = computed(() => props.nodeCode || props.node?.nodeKey || '');
  const currentNode = computed(() => workflow.value?.nodes?.find((item) => item.nodeKey === nodeKey.value) || null);
  const slots = computed(() => buildDetailedDesignNodeUploadSlots(workflow.value?.uploadSlots, nodeKey.value));
  const notifyChanged = (payload = {}) => emit('business-state-changed', {
    source: 'detailed-design',
    nodeKey: nodeKey.value,
    changedDocumentIds: [],
    ...payload
  });
  const actions = useDetailedDesignWorkflow({
    projectId: computed(() => props.projectId),
    authToken: computed(() => props.authToken),
    roleDefinitions: detailedDesignRoleDefinitions,
    getNodeName: () => currentNode.value?.nodeName || '节点',
    notifyChanged
  });

  watch(workflow, (value) => actions.syncRoleSelections(value), { immediate: true });
  onBeforeUnmount(actions.clearLocalState);

  return {
    context,
    workflow,
    nodeKey,
    currentNode,
    slots,
    notifyChanged,
    ...actions
  };
}

export const detailedDesignNodePageProps = {
  projectId: { type: String, required: true },
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  project: { type: Object, default: null },
  workspace: { type: Object, default: null },
  stage: { type: Object, default: null },
  node: { type: Object, default: null },
  nodeCode: { type: String, required: true },
  nodePageContext: { type: Object, default: () => ({}) }
};
