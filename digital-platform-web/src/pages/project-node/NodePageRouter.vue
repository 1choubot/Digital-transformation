<template>
  <component
    :is="NodePage"
    :project-id="projectId"
    :auth-token="authToken"
    :current-user="currentUser"
    :project="project"
    :workspace="workspace"
    :stage="stage"
    :node="node"
    :node-code="normalizedNodeCode"
    :node-page-context="nodePageContext"
    @business-state-changed="emit('business-state-changed', $event)"
  />
</template>

<script setup>
import { computed } from 'vue';
import { resolveNodePage } from '../../config/nodePages.js';

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

const normalizedNodeCode = computed(() => props.nodeCode || props.node?.nodeKey || '');
const NodePage = computed(() => resolveNodePage(normalizedNodeCode.value));
</script>
