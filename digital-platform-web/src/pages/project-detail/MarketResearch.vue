<template>
  <section class="panel">
    <div class="panel-heading">
      <span class="section-eyebrow">{{ stageNode.stage.stageName }}</span>
      <h3>{{ stageNode.node.nodeName }}</h3>
    </div>
    <ProjectWorkspaceOutputPanel
      :stage="stageNode.stage"
      :node="stageNode.node"
      :online-form-data="onlineFormData"
      :is-action-pending="() => false"
      :get-output-document="(o) => o"
      :responsibility-selections="responsibilitySelections"
      @open-legacy-checklist="$emit('openLegacyChecklist')"
    />
  </section>
</template>

<script setup>
import ProjectWorkspaceOutputPanel from '../../components/project-workspace/ProjectWorkspaceOutputPanel.vue';

defineProps({
  stageNode: { type: Object, required: true },
  onlineFormData: { type: Object, default: () => ({}) },
  responsibilitySelections: { type: Object, default: () => ({}) }
});

defineEmits(['openLegacyChecklist']);
</script>
