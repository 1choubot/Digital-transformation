<template>
  <BlankProjectNodePage
    page-title="方案设计准备"
    :project-id="projectId"
    :auth-token="authToken"
    :current-user="currentUser"
    :project="project"
    :workspace="workspace"
    :stage="stage"
    :node="node"
    :node-code="nodeCode"
    :node-page-context="nodePageContext"
    @business-state-changed="$emit('business-state-changed', $event)"
  />
</template>

<script setup>
import BlankProjectNodePage from './BlankProjectNodePage.vue';

defineEmits(['business-state-changed']);

defineProps({
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
</script>
