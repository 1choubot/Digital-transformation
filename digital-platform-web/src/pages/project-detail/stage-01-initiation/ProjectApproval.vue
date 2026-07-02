<template>
  <section class="panel">
    <div class="panel-heading">
      <span class="section-eyebrow">{{ stageNode.stage.stageName }}</span>
      <h3>{{ stageNode.node.nodeName }}</h3>
      <p>审批通过或退回该立项审批，退回将连带 1.1 项目需求表返工。</p>
    </div>

    <section v-if="actionMessage || actionErrorMessage" class="state-panel state-panel--inline" :class="{ 'state-panel--error': actionErrorMessage, 'state-panel--success': actionMessage }">
      <p>{{ actionErrorMessage || actionMessage }}</p>
    </section>

    <ProjectWorkspaceOutputPanel
      :stage="stageNode.stage"
      :node="stageNode.node"
      :online-form-data="onlineFormData"
      :online-form-loading="false"
      :online-form-saving="false"
      :online-form-submitting="false"
      :online-form-error-message="'项目需求表审核通过后，方可提交立项审批。'"
      :is-action-pending="isActionPending"
      :get-output-document="(o) => o"
      :responsibility-selections="responsibilitySelections"
      @open-legacy-checklist="$emit('openLegacyChecklist')"
      @approve-node="handleApprove"
      @return-node="handleReturn"
    />
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { approveInitiationReviewNode, returnInitiationReviewNode, toReadableApiError } from '../../../api/projects.js';
import ProjectWorkspaceOutputPanel from '../../../components/project-workspace/ProjectWorkspaceOutputPanel.vue';

const props = defineProps({
  stageNode: { type: Object, required: true },
  authToken: { type: String, default: '' },
  projectId: { type: String, required: true },
  onlineFormData: { type: Object, default: () => ({}) },
  responsibilitySelections: { type: Object, default: () => ({}) }
});

defineEmits(['openLegacyChecklist', 'refresh']);

const actionMessage = ref('');
const actionErrorMessage = ref('');
const pendingAction = ref('');

// key: documentId + nodeKey
function actionKey(documentId, nodeKey) {
  return `${documentId}:${nodeKey}`;
}

function isActionPending(documentId, action) {
  return pendingAction.value === actionKey(documentId, action);
}

function clearActionState() {
  actionMessage.value = '';
  actionErrorMessage.value = '';
}

async function handleApprove({ document, node, comment }) {
  clearActionState();
  pendingAction.value = actionKey(document.id, node.nodeKey);

  try {
    await approveInitiationReviewNode(
      props.projectId,
      document.id,
      node.nodeKey,
      comment || '',
      props.authToken
    );
    const successText = node.nodeKey === 'general_review'
      ? '总经理审批已通过。'
      : `${node.nodeName || '评价'}已提交。`;
    actionMessage.value = successText;
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  } finally {
    pendingAction.value = '';
  }
}

async function handleReturn({ document, node, returnReason }) {
  clearActionState();
  const reason = String(returnReason || '').trim();
  if (!reason) {
    actionErrorMessage.value = '请填写退回原因。';
    return;
  }

  pendingAction.value = actionKey(document.id, node.nodeKey);

  try {
    await returnInitiationReviewNode(
      props.projectId,
      document.id,
      node.nodeKey,
      reason,
      props.authToken
    );
    actionMessage.value = `${node.nodeName || '审批'}已退回，1.1 项目需求表进入返工，1.2 需要重新填写。`;
  } catch (error) {
    actionErrorMessage.value = toReadableApiError(error);
  } finally {
    pendingAction.value = '';
  }
}
</script>
