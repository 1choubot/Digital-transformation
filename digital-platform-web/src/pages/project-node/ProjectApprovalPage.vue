<template>
  <section class="project-workspace__detail project-approval-node-page">
    <NodeOnlineFormEditor
      v-if="activeForm"
      :form="activeForm"
      :form-data="context.onlineFormData || emptyObject"
      :error-message="context.onlineFormErrorMessage || ''"
      :saving="context.onlineFormSaving === true"
      :submitting="context.onlineFormSubmitting === true"
      :image-state="context.onlineFormImageState || emptyObject"
      @save="saveOnlineForm"
      @submit="submitOnlineForm"
      @update-field="invoke('updateOnlineFormField', $event)"
      @upload-image="invoke('uploadOnlineFormImage', $event)"
      @download-image="invoke('downloadOnlineFormImage', $event)"
      @delete-image="invoke('deleteOnlineFormImage', $event)"
    />

    <section v-else-if="context.onlineFormErrorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ context.onlineFormErrorMessage }}</p>
    </section>

    <section v-else-if="approvalOutput?.formAvailable" class="state-panel state-panel--inline">
      <p>{{ context.onlineFormLoading === true ? '在线表单加载中...' : '正在打开在线表单...' }}</p>
    </section>

    <section v-else class="state-panel state-panel--inline">
      <p>{{ unavailableMessage }}</p>
    </section>

    <ProjectInitiationReviewPanel
      v-if="approvalDocument?.initiationReview"
      :document="approvalDocument"
      :is-action-pending="isActionPending"
      @approve-node="approveNode"
      @return-node="returnNode"
    />

    <section v-else class="state-panel state-panel--inline">
      <p>审批记录尚未生成。</p>
    </section>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import NodeOnlineFormEditor from '../../components/node/NodeOnlineFormEditor.vue';
import ProjectInitiationReviewPanel from '../../components/project-detail/ProjectInitiationReviewPanel.vue';

const emit = defineEmits(['business-state-changed']);

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  project: {
    type: Object,
    default: null
  },
  workspace: {
    type: Object,
    default: null
  },
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  nodeCode: {
    type: String,
    default: ''
  },
  nodePageContext: {
    type: Object,
    default: () => ({})
  }
});

const APPROVAL_DOCUMENT_CODE = '1.2';
const emptyObject = Object.freeze({});
const requestedDocumentId = ref(null);

const context = computed(() => props.nodePageContext || emptyObject);
const approvalOutput = computed(() =>
  (props.node?.outputs || []).find(
    (item) => String(item.documentCode || item.legacyDocumentCode || '') === APPROVAL_DOCUMENT_CODE
  ) || null
);
const approvalDocument = computed(() =>
  approvalOutput.value ? context.value.getOutputDocument?.(approvalOutput.value) || null : null
);
const isActiveOutputForm = computed(
  () =>
    approvalOutput.value?.documentId &&
    String(context.value.activeOnlineFormDocumentId || '') === String(approvalOutput.value.documentId)
);
const activeForm = computed(() =>
  isActiveOutputForm.value ? context.value.activeOnlineForm || null : null
);
const unavailableMessage = computed(() => {
  if (!approvalOutput.value) {
    return `当前节点尚未返回 ${APPROVAL_DOCUMENT_CODE} 在线表单。`;
  }

  return '关联资料未初始化，暂不能打开在线表单。';
});

watch(
  () => approvalOutput.value?.documentId || null,
  (documentId) => {
    requestedDocumentId.value = null;
    if (documentId) {
      openApprovalForm();
    }
  },
  { immediate: true }
);

watch(
  () => [
    approvalOutput.value?.documentId || null,
    context.value.activeOnlineFormDocumentId || null,
    context.value.onlineFormLoading === true
  ],
  () => {
    openApprovalForm();
  }
);

function invoke(name, payload) {
  const handler = context.value?.[name];
  if (typeof handler === 'function') {
    return handler(payload);
  }
  return undefined;
}

function openApprovalForm() {
  const output = approvalOutput.value;
  if (!output?.documentId || output.formAvailable !== true) {
    return;
  }

  if (isActiveOutputForm.value && activeForm.value) {
    return;
  }

  if (context.value.onlineFormLoading === true) {
    return;
  }

  if (String(requestedDocumentId.value || '') === String(output.documentId)) {
    return;
  }

  requestedDocumentId.value = output.documentId;
  invoke('openOnlineForm', output);
}

function notifyFormChanged(changedDocumentIds = []) {
  emit('business-state-changed', {
    changedDocumentIds: changedDocumentIds.length
      ? changedDocumentIds
      : approvalOutput.value?.documentId
        ? [approvalOutput.value.documentId]
        : [],
    affectedNodeCodes: props.node?.nodeKey ? [props.node.nodeKey] : [],
    refreshCurrentDetail: true
  });
}

function saveOnlineForm() {
  invoke('saveOnlineForm');
  notifyFormChanged();
}

function submitOnlineForm() {
  invoke('submitOnlineForm');
  notifyFormChanged();
}

function approveNode(payload) {
  invoke('approveInitiationNode', payload);
  notifyFormChanged(payload?.document?.id ? [payload.document.id] : []);
}

function returnNode(payload) {
  invoke('returnInitiationNode', payload);
  emit('business-state-changed', {
    changedDocumentIds: payload?.document?.id ? [payload.document.id] : [],
    affectedNodeCodes: ['market_research', 'initiation_approval'],
    refreshCurrentDetail: true
  });
}

function isActionPending(documentId, action) {
  return context.value.isActionPending?.(documentId, action) || false;
}
</script>
