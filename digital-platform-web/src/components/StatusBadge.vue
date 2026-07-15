<template>
  <el-tag :type="tagType">{{ label }}</el-tag>
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
const tagType = computed(() => {
  if (['risk', 'delayed', 'returned', 'returned_by_center_manager', 'returned_by_general_manager'].includes(props.status)) {
    return 'warning';
  }
  if (['paused', 'cancelled', 'ended'].includes(props.status)) return 'info';
  if (['confirmed', 'completed', 'approved'].includes(props.status)) return 'success';
  if (['submitted', 'pending_center_manager', 'pending_general_manager', 'current', 'normal'].includes(props.status)) {
    return 'primary';
  }
  return 'info';
});
</script>
