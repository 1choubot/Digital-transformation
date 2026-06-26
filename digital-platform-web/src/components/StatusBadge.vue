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
  const s = props.status;
  if (['risk', 'delayed', 'returned', 'returned_by_center_manager', 'returned_by_general_manager'].includes(s)) return 'warn';
  if (['paused', 'cancelled'].includes(s)) return 'paused';
  if (['confirmed', 'completed', 'approved'].includes(s)) return 'success';
  if (['submitted', 'pending_center_manager', 'pending_general_manager', 'current', 'normal'].includes(s)) return 'active';
  return 'muted';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.5rem;
  border-radius: 4px; /* 统一使用微圆角 4px 贴合后台管理风格 */
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

/* ===== 现代后台柔和浅色系配色 (完全对齐 App.vue 色板) ===== */

/* 进行中 / 活跃状态 (品牌蓝) */
.status-badge--active {
  background-color: #ecf5ff;
  color: #3e63dd;
  border-color: #d9ecff;
}

/* 成功 / 已完成状态 (生态绿) */
.status-badge--success {
  background-color: #f0f9eb;
  color: #67c23a;
  border-color: #e1f3d8;
}

/* 警告 / 延期 / 退回状态 (危险红) */
.status-badge--warn {
  background-color: #fef0f0;
  color: #f56c6c;
  border-color: #fde2e2;
}

/* 暂停 / 默认 / 未开始状态 (钛金灰) */
.status-badge--paused,
.status-badge--muted {
  background-color: #f4f4f5;
  color: #909399;
  border-color: #e9e9eb;
}
</style>