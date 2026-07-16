<template>
  <section class="project-workspace__detail project-notice-node-page">
    <NodeOnlineFormEditor
      v-if="activeForm"
      :form="activeForm"
      :node-status="node?.nodeStatus || ''"
      :blocking-reasons="node?.blockingReasons || []"
      :form-data="context.onlineFormData || emptyObject"
      :error-message="context.onlineFormErrorMessage || ''"
      :saving="context.onlineFormSaving === true"
      :submitting="context.onlineFormSubmitting === true"
      :generated-file="generatedFile"
      :download-pending="generatedFileDownloadPending"
      download-button-text="查看项目立项通知"
      :show-form-content="canViewFormContent"
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
import { isInitiationNoticeFormFiller, isOnlineFormContentVisible } from '../../../utils/onlineFormVisibility.js';

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
  documentCode: '1.3'
});

const canViewFormContent = computed(() =>
  isInitiationNoticeFormFiller(props.currentUser)
  && isOnlineFormContentVisible({
    nodeStatus: output.value?.status || props.node?.nodeStatus,
    formStatus: activeForm.value?.status || output.value?.baseStatus
  })
);
</script>
