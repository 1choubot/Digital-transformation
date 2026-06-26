<template>
  <ol class="stage-stepper">
    <li
      v-for="(stage, index) in stages"
      :key="stage.stageKey"
      class="stage-stepper__item"
      :class="{
        'is-current': stage.isCurrent,
        'is-completed': stage.stageStatus === 'completed',
        'is-pending': stage.stageStatus === 'pending' || stage.stageStatus === 'not_started'
      }"
    >
      <div class="stage-stepper__header">
        <span class="stage-stepper__order">{{ String(index + 1).padStart(2, '0') }}</span>
        <span class="stage-stepper__line" v-if="index < stages.length - 1"></span>
      </div>
      
      <div class="stage-stepper__info">
        <strong>{{ stage.stageName }}</strong>
        <div class="stage-stepper__badges">
          <StatusBadge :status="stage.stageStatus" />
          <StatusBadge v-if="stage.approvalStatus" :status="stage.approvalStatus" />
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue';

defineProps({
  stages: { type: Array, default: () => [] }
});
</script>

<style scoped>
.stage-stepper {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 1rem;
}

.stage-stepper__item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  position: relative;
}

.stage-stepper__header {
  display: flex;
  align-items: center;
}

.stage-stepper__order {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  z-index: 1;
}

.stage-stepper__line {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 0.5rem;
}

.is-current .stage-stepper__order { background: #3b82f6; color: white; }
.is-completed .stage-stepper__order { background: #dcfce7; color: #166534; }

.stage-stepper__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stage-stepper__info strong { font-size: 0.9rem; color: #1e293b; }
.stage-stepper__badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>