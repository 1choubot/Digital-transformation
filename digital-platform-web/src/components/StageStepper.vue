<template>
  <ol class="stage-stepper">
    <li
      v-for="stage in stages"
      :key="stage.stageKey"
      class="stage-stepper__item"
      :class="{ 'stage-stepper__item--current': stage.isCurrent }"
    >
      <span class="stage-stepper__order">{{ String(stage.stageOrder).padStart(2, '0') }}</span>
      <div>
        <strong>{{ stage.stageName }}</strong>
        <span class="stage-stepper__badges">
          <StatusBadge :status="stage.stageStatus" />
        </span>
      </div>
    </li>
  </ol>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue';

defineProps({
  stages: {
    type: Array,
    default: () => []
  }
});
</script>
