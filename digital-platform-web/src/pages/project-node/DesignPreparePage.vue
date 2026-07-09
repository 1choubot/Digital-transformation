<template>
  <ProjectNodeWorkspacePanel
    page-title="方案设计准备"
    :stage="stage"
    :node="node"
    :node-page-context="nodePageContext"
    @business-state-changed="$emit('business-state-changed', $event)"
  />
</template>

<script setup>
import ProjectNodeWorkspacePanel from './ProjectNodeWorkspacePanel.vue';

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
