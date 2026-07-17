import { computed, onBeforeUnmount, watch } from 'vue';
import { useSolutionDesignWorkflow } from './useSolutionDesignWorkflow.js';
import { buildNodeUploadSlots } from './solutionDesignUploadSlots.js';

export const solutionDesignRoleDefinitions = Object.freeze([
  { roleKey: 'project_manager', label: '项目经理', payloadKey: 'projectManagerUserId' },
  { roleKey: 'technical_owner', label: '技术负责人', payloadKey: 'technicalOwnerUserId', requiredDepartment: 'rd_center' },
  { roleKey: 'business_owner', label: '商务负责人', payloadKey: 'businessOwnerUserId', requiredDepartment: 'marketing_center' },
  { roleKey: 'procurement_owner', label: '采购负责人', payloadKey: 'procurementOwnerUserId', requiredDepartment: 'manufacturing_center' },
  { roleKey: 'finance_accountant', label: '财务会计', payloadKey: 'financeAccountantUserId', requiredDepartment: 'operations_center' },
  { roleKey: 'finance_owner', label: '财务负责人', payloadKey: 'financeOwnerUserId', requiredDepartment: 'operations_center' }
]);

export function useSolutionDesignNodePage(props, emit) {
  const context = computed(() => props.nodePageContext || {});
  const workflow = computed(() => context.value.solutionDesignWorkflow || null);
  const uploads = computed(() => context.value.solutionDesignUploads || null);
  const nodeKey = computed(() => props.nodeCode || props.node?.nodeKey || '');
  const currentNode = computed(() => workflow.value?.nodes?.find((item) => item.nodeKey === nodeKey.value) || null);
  const slots = computed(() => buildNodeUploadSlots(
    uploads.value?.slots,
    nodeKey.value,
    workflow.value
  ));
  const notifyChanged = (payload = {}) => emit('business-state-changed', {
    source: 'solution-design',
    nodeKey: nodeKey.value,
    changedDocumentIds: [],
    ...payload
  });
  const actions = useSolutionDesignWorkflow({
    projectId: computed(() => props.projectId),
    authToken: computed(() => props.authToken),
    roleDefinitions: solutionDesignRoleDefinitions,
    getNodeName: () => currentNode.value?.nodeName || '节点',
    notifyChanged
  });
  watch(workflow, (value) => actions.syncRoleSelections(value), { immediate: true });
  onBeforeUnmount(actions.clearLocalState);
  return { context, workflow, nodeKey, currentNode, slots, notifyChanged, ...actions };
}

export const solutionDesignNodePageProps = {
  projectId: { type: String, required: true }, authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true }, project: { type: Object, default: null },
  workspace: { type: Object, default: null }, stage: { type: Object, default: null },
  node: { type: Object, default: null }, nodeCode: { type: String, required: true },
  nodePageContext: { type: Object, default: () => ({}) }
};
