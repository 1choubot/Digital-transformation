import { computed, onBeforeMount, watch } from 'vue';
import { useContractSigningWorkflow } from './useContractSigningWorkflow.js';

export const contractSigningNodePageProps = {
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

export function useContractSigningNodePage(props, emit) {
  const context = computed(() => props.nodePageContext || {});
  const initialWorkflow = computed(
    () => context.value.contractSigningWorkflow || props.workspace?.contractSigningWorkflow || null
  );
  const nodeKey = computed(() => props.nodeCode || props.node?.nodeKey || '');

  const notifyChanged = () =>
    emit('business-state-changed', {
      source: 'contract-signing',
      nodeKey: nodeKey.value,
      refreshCurrentDetail: true
    });

  const actions = useContractSigningWorkflow({
    projectId: computed(() => props.projectId),
    authToken: computed(() => props.authToken),
    initialWorkflow,
    notifyChanged
  });

  const workflow = computed(() => actions.workflow.value || initialWorkflow.value || null);
  const currentNode = computed(
    () => workflow.value?.nodes?.find((item) => item.nodeKey === nodeKey.value) || props.node || null
  );
  const slots = computed(() =>
    (workflow.value?.uploadSlots || [])
      .filter((slot) => slot.nodeKey === nodeKey.value)
      .sort((left, right) => Number(left.slotOrder || 0) - Number(right.slotOrder || 0))
  );
  const paymentFlow = computed(() => workflow.value?.paymentFlow || null);
  const loading = computed(() => actions.loading.value);
  const errorMessage = computed(() => actions.errorMessage.value);

  watch(initialWorkflow, (value) => actions.setWorkflow(value), { immediate: true });
  onBeforeMount(() => {
    if (!workflow.value) {
      void actions.load();
    }
  });

  return {
    ...actions,
    context,
    workflow,
    nodeKey,
    currentNode,
    slots,
    paymentFlow,
    loading,
    errorMessage,
    notifyChanged
  };
}
