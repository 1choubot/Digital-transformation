<template>
  <section class="project-node-page" :aria-label="pageTitle">
    <ProjectWorkspaceOutputPanel
      :stage="stage"
      :node="node"
      :active-online-form="context.activeOnlineForm"
      :active-online-form-document-id="context.activeOnlineFormDocumentId"
      :online-form-data="context.onlineFormData || emptyObject"
      :online-form-loading="context.onlineFormLoading === true"
      :online-form-saving="context.onlineFormSaving === true"
      :online-form-submitting="context.onlineFormSubmitting === true"
      :online-form-error-message="context.onlineFormErrorMessage || ''"
      :online-form-image-state="context.onlineFormImageState || emptyObject"
      :is-action-pending="context.isActionPending || falseFunction"
      :get-output-document="context.getOutputDocument || nullFunction"
      :responsibility-candidates="context.responsibilityCandidates || emptyArray"
      :responsibility-candidates-loading="context.responsibilityCandidatesLoading === true"
      :responsibility-candidates-error-message="context.responsibilityCandidatesErrorMessage || ''"
      :responsibility-selections="context.responsibilitySelections || emptyObject"
      :can-submit-document="context.canSubmitDocument || falseFunction"
      :can-confirm-return-document="context.canConfirmReturnDocument || falseFunction"
      :can-manage-responsibility="context.canManageResponsibility || falseFunction"
      :can-change-applicability="context.canChangeApplicability || falseFunction"
      :return-reasons="context.returnReasons || emptyObject"
      :not-applicable-reasons="context.notApplicableReasons || emptyObject"
      :get-attachment-state="context.getAttachmentState || attachmentStateFunction"
      @open-online-form="invoke('openOnlineForm', $event)"
      @save-online-form="invoke('saveOnlineForm')"
      @submit-online-form="invoke('submitOnlineForm')"
      @update-online-form-field="invoke('updateOnlineFormField', $event)"
      @approve-node="invoke('approveInitiationNode', $event)"
      @return-node="invoke('returnInitiationNode', $event)"
      @submit-document="invoke('submitDocument', $event)"
      @confirm-document="invoke('confirmDocument', $event)"
      @return-document="invoke('returnDocument', $event)"
      @complete-revision-document="invoke('completeRevisionDocument', $event)"
      @mark-not-applicable="invoke('markNotApplicable', $event)"
      @restore-applicable="invoke('restoreApplicable', $event)"
      @save-responsible-user="invoke('saveResponsibleUser', $event)"
      @clear-responsible-user="invoke('clearResponsibleUser', $event)"
      @upload-attachment="invoke('uploadAttachment', $event)"
      @download-attachment="invoke('downloadAttachment', $event)"
      @delete-attachment="invoke('deleteAttachment', $event)"
      @upload-online-form-image="invoke('uploadOnlineFormImage', $event)"
      @download-online-form-image="invoke('downloadOnlineFormImage', $event)"
      @delete-online-form-image="invoke('deleteOnlineFormImage', $event)"
      @download-generated-file="invoke('downloadGeneratedFile', $event)"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ProjectWorkspaceOutputPanel from '../../components/project-workspace/ProjectWorkspaceOutputPanel.vue';

const props = defineProps({
  pageTitle: {
    type: String,
    default: '项目节点'
  },
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  nodePageContext: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['business-state-changed']);

const emptyObject = Object.freeze({});
const emptyArray = Object.freeze([]);
const context = computed(() => props.nodePageContext || emptyObject);

function falseFunction() {
  return false;
}

function nullFunction() {
  return null;
}

function attachmentStateFunction() {
  return {
    attachments: [],
    loading: false,
    errorMessage: '',
    uploadPending: false,
    downloadPendingId: null,
    deletePendingId: null
  };
}

function invoke(name, payload) {
  const handler = props.nodePageContext?.[name];
  if (typeof handler === 'function') {
    handler(payload);
  }
}

function notifyBusinessStateChanged(payload) {
  emit('business-state-changed', payload);
}

defineExpose({
  notifyBusinessStateChanged
});
</script>
