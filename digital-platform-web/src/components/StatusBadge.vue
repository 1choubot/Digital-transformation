<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { formatStatus } from '../utils/format.js';

const props = defineProps({
  status: {
    type: String,
    default: ''
  }
});

const label = computed(() => formatStatus(props.status));
const tone = computed(() => {
  if (props.status === 'risk' || props.status === 'delayed') return 'warn';
  if (props.status === 'returned') return 'warn';
  if (props.status === 'paused') return 'paused';
  if (props.status === 'confirmed') return 'done';
  if (props.status === 'completed') return 'done';
  if (props.status === 'submitted') return 'active';
  if (props.status === 'current' || props.status === 'normal') return 'active';
  return 'muted';
});
</script>
