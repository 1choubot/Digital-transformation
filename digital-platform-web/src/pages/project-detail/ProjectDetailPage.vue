<template>
  <ProjectDetailLayout
    :auth-token="authToken"
    :current-user="currentUser"
    :project-id="projectId"
    :task-mode="taskMode"
    :focus-document-id="focusDocumentId"
    :focus-stage-id="focusStageId"
    :focus-node-key="focusNodeKey"
    :navigate="navigate"
  />
</template>

<script setup>
import ProjectDetailLayout from './ProjectDetailLayout.vue';

defineProps({
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  taskMode: {
    type: String,
    default: ''
  },
  focusDocumentId: {
    type: String,
    default: ''
  },
  focusStageId: {
    type: String,
    default: ''
  },
  focusNodeKey: {
    type: String,
    default: ''
  },
  navigate: {
    type: Function,
    required: true
  }
});
</script>
