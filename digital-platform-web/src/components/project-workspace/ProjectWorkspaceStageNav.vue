<template>
  <nav class="project-workspace__stage-nav" aria-label="项目 8 阶段导航">
    <button
      v-for="stage in stages"
      :key="stage.stageKey"
      type="button"
      class="project-workspace__stage-button"
      :class="{
        'project-workspace__stage-button--active': selectedStageKey === stage.stageKey,
        'project-workspace__stage-button--current': stage.isCurrent
      }"
      @click="$emit('select-stage', stage)"
    >
      <span>{{ stage.stageOrder }}. {{ stage.stageName }}</span>
      <small>{{ formatStageSummary(stage) }}</small>
    </button>
  </nav>
</template>

<script setup>
defineEmits(['select-stage']);

defineProps({
  stages: {
    type: Array,
    default: () => []
  },
  selectedStageKey: {
    type: String,
    default: ''
  }
});

function formatStageSummary(stage) {
  if (stage.configured) {
    return `${stage.nodes?.length || 0} 个蓝色节点`;
  }

  if (stage.legacyChecklistAvailable) {
    return '旧资料清单入口';
  }

  return '后续配置';
}
</script>
