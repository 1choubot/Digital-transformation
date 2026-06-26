<template>
  <div class="stage-document-responsibility-action">
    <label>
      <span>资料责任人</span>
      <select
        v-model="selections[document.id]"
        :disabled="candidatesLoading || pending"
      >
        <option value="">未分配</option>
        <option
          v-if="showDisabledResponsibleOption(document, candidates)"
          :value="String(document.responsibleUserId)"
          disabled
        >
          {{ formatResponsibleUser(document) }}（已禁用）
        </option>
        <option v-for="user in candidates" :key="user.id" :value="String(user.id)">
          {{ formatResponsibilityCandidate(user) }}
        </option>
      </select>
    </label>
    <div class="stage-document-responsibility-action__buttons">
      <button
        type="button"
        class="ghost-button"
        :disabled="candidatesLoading || pending"
        @click="$emit('save', document)"
      >
        {{ pending ? '保存中...' : '保存责任人' }}
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="pending || !document.responsibleUserId"
        @click="$emit('clear', document)"
      >
        清空
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  formatResponsibilityCandidate,
  formatResponsibleUser,
  showDisabledResponsibleOption
} from './stageDocumentViewHelpers.js';

defineEmits(['save', 'clear']);

defineProps({
  document: {
    type: Object,
    required: true
  },
  candidates: {
    type: Array,
    default: () => []
  },
  candidatesLoading: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  selections: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
/* ===== 外层容器 ===== */
.stage-document-responsibility-action {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.35rem 0;
}

/* ===== 标签 + 下拉选择器 ===== */
.stage-document-responsibility-action > label {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: #606266;
  flex-wrap: wrap;
}

.stage-document-responsibility-action > label span {
  font-weight: 500;
  color: #909399;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stage-document-responsibility-action select {
  padding: 0.25rem 1.8rem 0.25rem 0.6rem;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #303133;
  background: #ffffff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  height: 30px;
  min-width: 200px;
  appearance: auto;
}

.stage-document-responsibility-action select:focus {
  border-color: #3e63dd;
}

.stage-document-responsibility-action select:disabled {
  background: #f5f7fa;
  color: #c0c4cc;
  cursor: not-allowed;
}

.stage-document-responsibility-action select option:disabled {
  color: #c0c4cc;
}

/* ===== 按钮组 ===== */
.stage-document-responsibility-action__buttons {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.stage-document-responsibility-action__buttons .ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.2rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 28px;
  white-space: nowrap;
}

.stage-document-responsibility-action__buttons .ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.stage-document-responsibility-action__buttons .ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================================ */
/* ===== 响应式适配 ===== */
/* ============================================================ */

/* 768px 以下：适当调整间距 */
@media (max-width: 768px) {
  .stage-document-responsibility-action {
    gap: 0.6rem 0.75rem;
  }

  .stage-document-responsibility-action select {
    min-width: 160px;
  }
}

/* 480px 以下：让 select 和按钮组占满宽度，堆叠 */
@media (max-width: 480px) {
  .stage-document-responsibility-action {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .stage-document-responsibility-action > label {
    flex-wrap: wrap;
    width: 100%;
  }

  .stage-document-responsibility-action > label span {
    width: 100%;
    margin-bottom: 0.1rem;
  }

  .stage-document-responsibility-action select {
    width: 100%;
    min-width: unset;
    height: 32px;
  }

  .stage-document-responsibility-action__buttons {
    justify-content: stretch;
    gap: 0.5rem;
  }

  .stage-document-responsibility-action__buttons .ghost-button {
    flex: 1;
    justify-content: center;
    height: 32px;
  }
}
</style>