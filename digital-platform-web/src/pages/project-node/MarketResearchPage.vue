<template>
  <section class="project-workspace__detail market-research-node-page">
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

    <section v-else-if="output?.formAvailable" class="state-panel state-panel--inline">
      <p>{{ context.onlineFormLoading === true ? '在线表单加载中...' : '正在打开在线表单...' }}</p>
    </section>

    <section v-else class="state-panel state-panel--inline">
      <p>{{ unavailableMessage }}</p>
    </section>
  </section>
</template>

<script setup>
import NodeOnlineFormEditor from '../../components/node/NodeOnlineFormEditor.vue';
import { useNodeOnlineForm } from '../../composables/node/useNodeOnlineForm.js';

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
  unavailableMessage,
  invoke,
  saveOnlineForm,
  submitOnlineForm
} = useNodeOnlineForm({
  props,
  emit,
  documentCode: '1.1'
});
</script>
