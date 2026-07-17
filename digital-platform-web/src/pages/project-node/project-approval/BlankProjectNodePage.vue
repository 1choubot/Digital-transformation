<template>
  <section class="project-workspace__detail blank-node-page">
    <section class="state-panel state-panel--inline">
      <p>该节点专属页面正在开发中。</p>
    </section>
  </section>
</template>

<script setup>
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
