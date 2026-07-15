import { computed, onBeforeUnmount, watch } from 'vue';
import { useSolutionDesignWorkflow } from './useSolutionDesignWorkflow.js';

export const solutionDesignRoleDefinitions = Object.freeze([
  { roleKey: 'project_manager', label: '项目经理', payloadKey: 'projectManagerUserId' },
  { roleKey: 'technical_owner', label: '技术负责人', payloadKey: 'technicalOwnerUserId' },
  { roleKey: 'business_owner', label: '商务负责人', payloadKey: 'businessOwnerUserId' },
  { roleKey: 'procurement_owner', label: '采购负责人', payloadKey: 'procurementOwnerUserId' },
  { roleKey: 'finance_accountant', label: '财务会计', payloadKey: 'financeAccountantUserId' },
  { roleKey: 'finance_owner', label: '财务负责人', payloadKey: 'financeOwnerUserId' }
]);

export function useSolutionDesignNodePage(props, emit) {
  const context = computed(() => props.nodePageContext || {});
  const workflow = computed(() => context.value.solutionDesignWorkflow || null);
  const uploads = computed(() => context.value.solutionDesignUploads || null);
  const nodeKey = computed(() => props.nodeCode || props.node?.nodeKey || '');
  const currentNode = computed(() => workflow.value?.nodes?.find((item) => item.nodeKey === nodeKey.value) || null);
  const slots = computed(() => (uploads.value?.slots || [])
    .filter((item) => item.nodeKey === nodeKey.value)
    .filter((item) => !(
      nodeKey.value === 'quotation_or_tender' &&
      item.slotKey === 'quotation_file' &&
      workflow.value?.quotationTender?.branchType === 'quotation'
    ))
    .sort((a, b) => Number(a.slotOrder || 0) - Number(b.slotOrder || 0)));
  const notifyChanged = () => emit('business-state-changed', { source: 'solution-design', nodeKey: nodeKey.value, changedDocumentIds: [] });
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
