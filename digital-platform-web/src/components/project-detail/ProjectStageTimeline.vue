<template>
  <section class="panel stage-status-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段状态</span>
        <h3>标准 8 阶段</h3>
      </div>
    </div>
    <div class="panel-body">
      <StageStepper :stages="stages" />
    </div>
  </section>
</template>

<script setup>
import StageStepper from '../StageStepper.vue';

defineProps({
  stages: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
/* ===== 卡片容器 ===== */
.stage-status-panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.stage-status-panel:hover {
  box-shadow: 0 8px 20px rgba(0, 21, 41, 0.06);
}

/* ===== 面板头部 ===== */
.panel-heading {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #909399;
  margin-bottom: 0.25rem;
}

.panel-heading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
  position: relative;
  padding-left: 10px;
}

.panel-heading h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  background: #3e63dd;
  border-radius: 2px;
}

/* ===== 面板主体 ===== */
.panel-body {
  padding: 1.5rem;
}

/* ============================================================ */
/* ===== 适配 StageStepper 内部样式（不影响组件本身） ===== */
/* 仅做微调，确保 StageStepper 在面板内居中且间距舒适 */
.panel-body :deep(.stage-stepper) {
  /* 假设组件根类名为 .stage-stepper */
  max-width: 100%;
  margin: 0 auto;
}

/* 如果 StageStepper 使用 flex 水平布局，居中 */
.panel-body :deep(.stage-stepper) {
  justify-content: center;
}

/* 如果步进器有步骤圆点或连接线，优化间距 */
.panel-body :deep(.stage-step) {
  padding: 0.25rem 0.5rem;
}

/* ===== 响应式适配 ===== */
@media (max-width: 768px) {
  .panel-heading {
    padding: 0.85rem 1rem;
  }

  .panel-body {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .panel-heading {
    padding: 0.75rem;
  }

  .panel-heading h3 {
    font-size: 0.95rem;
  }

  .panel-body {
    padding: 0.75rem;
  }
}
</style>