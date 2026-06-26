<template>
  <section class="stage-document-trace" aria-label="资料项追溯">
    <h4>追溯</h4>
    <div class="trace-list">
      <span>提交：{{ formatTrace(document.submittedByUserId, document.submittedAt) }}</span>
      <span>确认：{{ formatTrace(document.confirmedByUserId, document.confirmedAt) }}</span>
      <span>退回：{{ formatTrace(document.returnedByUserId, document.returnedAt) }}</span>
      <span v-if="document.returnReason">原因：{{ document.returnReason }}</span>
      <span>不适用：{{ formatTrace(document.notApplicableByUserId, document.notApplicableAt) }}</span>
      <span v-if="document.notApplicableReason">不适用原因：{{ document.notApplicableReason }}</span>
      <span>恢复适用：{{ formatTrace(document.restoredApplicableByUserId, document.restoredApplicableAt) }}</span>
      <span>责任人变更：{{ formatTrace(document.responsibilityUpdatedByUserId, document.responsibilityUpdatedAt) }}</span>
    </div>
  </section>
</template>

<script setup>
import { formatTrace } from './stageDocumentViewHelpers.js';

defineProps({
  document: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
/* ===== 外层容器 ===== */
.stage-document-trace {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
}

.stage-document-trace h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.25rem 0;
}

/* ===== 追溯列表 ===== */
.trace-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.15rem 1.5rem;
  padding: 0.25rem 0;
}

.trace-list span {
  font-size: 0.75rem;
  color: #606266;
  line-height: 1.5;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

/* 标签部分（如“提交：”“确认：”） */
.trace-list span::before {
  content: attr(data-label);
  font-weight: 500;
  color: #909399;
  white-space: nowrap;
}

/* 如果直接使用文本内容，则用伪类无法实现，采用另一种方式：使用内容本身 */
/* 我们直接对文本进行处理，通过 :first-letter 或直接样式 */
.trace-list span {
  word-break: break-word;
}

/* 让每个 span 内的标签部分（冒号前）变灰 */
.trace-list span {
  color: #303133;
}

/* 为兼容原有模板，不改变内容，通过样式调整 */
/* 但更好的方式是在模板中加类，为保持纯净，使用以下方法 */
/* 因为内容格式为 "提交：xxx"，我们可以通过色块区分 */
.trace-list span {
  color: #606266;
}

.trace-list span:not(:last-child) {
  padding-bottom: 0.05rem;
  border-bottom: 1px dashed #f4f4f5;
}

/* 对于有“原因”或“不适用原因”的项，稍微突出 */
.trace-list span:has(> .trace-reason) {
  /* 不使用，保持简洁 */
}

/* 但为了区分，我们可以给原因项增加背景 */
/* 使用属性选择器无法直接匹配文本，使用 :nth-child 等不现实，我们直接通过模板内的内容判断 */
/* 实际上我们可以给 span 加动态类，但为保持模板不变，此处不作额外处理 */
/* 我们采用更简洁的方式：所有项统一风格，原因项不作特殊处理，保持统一 */

/* ============================================================ */
/* ===== 响应式适配 ===== */
/* ============================================================ */

/* 768px 以下：网格列数减少 */
@media (max-width: 768px) {
  .trace-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.1rem 1rem;
  }
}

/* 480px 以下：改为单列 */
@media (max-width: 480px) {
  .trace-list {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }

  .trace-list span {
    font-size: 0.7rem;
    padding: 0.1rem 0;
    border-bottom: 1px solid #f4f4f5;
  }

  .trace-list span:last-child {
    border-bottom: none;
  }
}
</style>