<template>
  <section class="project-workspace__detail market-research-node-page">
    <NodeOnlineFormEditor
      v-if="activeForm && canViewFormContent"
      :form="activeForm"
      :node-status="node?.nodeStatus || ''"
      :blocking-reasons="node?.blockingReasons || []"
      :form-data="context.onlineFormData || emptyObject"
      :error-message="context.onlineFormErrorMessage || ''"
      :saving="context.onlineFormSaving === true"
      :submitting="context.onlineFormSubmitting === true"
      :generated-file="generatedFile"
      :download-pending="generatedFileDownloadPending"
      download-button-text="查看项目需求表"
      :image-state="context.onlineFormImageState || emptyObject"
      @save="saveOnlineForm"
      @submit="submitOnlineForm"
      @download-form="downloadOnlineFormFile"
      @update-field="invoke('updateOnlineFormField', $event)"
      @upload-image="invoke('uploadOnlineFormImage', $event)"
      @download-image="invoke('downloadOnlineFormImage', $event)"
      @delete-image="invoke('deleteOnlineFormImage', $event)"
    />

    <el-alert
      v-else-if="context.onlineFormErrorMessage"
      :title="context.onlineFormErrorMessage"
      type="error"
      show-icon
      :closable="false"
    />

    <el-skeleton v-else-if="output?.formAvailable && context.onlineFormLoading" :rows="6" animated />

    <el-empty v-else :description="unavailableMessage" />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import NodeOnlineFormEditor from '../../../components/node/NodeOnlineFormEditor.vue';
import { useNodeOnlineForm } from '../../../composables/node/useNodeOnlineForm.js';

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

const {
  emptyObject,
  context,
  output,
  activeForm,
  generatedFile,
  generatedFileDownloadPending,
  unavailableMessage,
  invoke,
  saveOnlineForm,
  submitOnlineForm,
  downloadOnlineFormFile
} = useNodeOnlineForm({
  props,
  emit,
  documentCode: '1.1'
});

const canViewFormContent = computed(() => {
  const permissions = activeForm.value?.permissions || {};
  return String(output.value?.responsibleUserId || '') === String(props.currentUser?.id || '')
    || permissions.canEdit === true
    || permissions.canSubmit === true;
});
</script>
