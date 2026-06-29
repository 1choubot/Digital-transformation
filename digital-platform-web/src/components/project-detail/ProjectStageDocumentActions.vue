<template>
  <section class="stage-document-card__actions" aria-label="资料项手工操作">
    <h4>手工操作</h4>
    <div class="stage-document-actions">
      <ProjectStageDocumentResponsibility
        v-if="canManageResponsibility"
        :document="document"
        :candidates="responsibilityCandidates"
        :candidates-loading="responsibilityCandidatesLoading"
        :pending="isActionPending(document.id, 'responsible-user')"
        :selections="responsibilitySelections"
        @save="$emit('save-responsible-user', $event)"
        @clear="$emit('clear-responsible-user', $event)"
      />

      <template v-if="!isApplicable(document)">
        <button
          v-if="canChangeApplicability"
          type="button"
          class="ghost-button"
          :disabled="isActionPending(document.id, 'restore-applicable')"
          @click="$emit('restore-applicable', document)"
        >
          {{ isActionPending(document.id, 'restore-applicable') ? '恢复中...' : '恢复适用' }}
        </button>
      </template>

      <template v-else>
        <button
          v-if="canSubmitDocument && canSubmit(document)"
          type="button"
          class="ghost-button"
          :disabled="isActionPending(document.id, 'submit')"
          @click="$emit('submit-document', document)"
        >
          {{ isActionPending(document.id, 'submit') ? '标记中...' : '标记提交' }}
        </button>

        <template v-else-if="document.status === 'submitted' && canConfirmReturnDocument">
          <button
            type="button"
            class="ghost-button"
            :disabled="isActionPending(document.id, 'confirm')"
            @click="$emit('confirm-document', document)"
          >
            {{ isActionPending(document.id, 'confirm') ? '确认中...' : '确认' }}
          </button>
          <div class="stage-document-return">
            <input
              v-model.trim="returnReasons[document.id]"
              type="text"
              placeholder="退回原因"
              :disabled="isActionPending(document.id, 'return')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isActionPending(document.id, 'return')"
              @click="$emit('return-document', document)"
            >
              {{ isActionPending(document.id, 'return') ? '退回中...' : '退回' }}
            </button>
          </div>
        </template>

        <span v-else class="stage-document-actions__empty">
          {{ document.status === 'confirmed' ? '已确认' : '暂无状态操作' }}
        </span>

        <div v-if="canChangeApplicability" class="stage-document-applicability-action">
          <input
            v-model.trim="notApplicableReasons[document.id]"
            type="text"
            placeholder="不适用原因"
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
          />
          <button
            type="button"
            class="ghost-button"
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
            @click="$emit('mark-not-applicable', document)"
          >
            {{ isActionPending(document.id, 'mark-not-applicable') ? '标记中...' : '标记不适用' }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import ProjectStageDocumentResponsibility from './ProjectStageDocumentResponsibility.vue';
import { canSubmit, isApplicable } from './stageDocumentViewHelpers.js';

defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
  'mark-not-applicable',
  'restore-applicable',
  'save-responsible-user',
  'clear-responsible-user'
]);

defineProps({
  document: {
    type: Object,
    required: true
  },
  responsibilityCandidates: {
    type: Array,
    default: () => []
  },
  responsibilityCandidatesLoading: {
    type: Boolean,
    default: false
  },
  responsibilitySelections: {
    type: Object,
    required: true
  },
  canSubmitDocument: {
    type: Boolean,
    default: true
  },
  canConfirmReturnDocument: {
    type: Boolean,
    default: true
  },
  canManageResponsibility: {
    type: Boolean,
    default: true
  },
  canChangeApplicability: {
    type: Boolean,
    default: true
  },
  returnReasons: {
    type: Object,
    required: true
  },
  notApplicableReasons: {
    type: Object,
    required: true
  },
  isActionPending: {
    type: Function,
    required: true
  }
});
</script>

<style scoped>
/* ===== 外层容器 ===== */
.stage-document-card__actions {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
}

.stage-document-card__actions h4 {
  font-size: 0.8rem;
  font-weight: 600;
  color: #606266;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.03em;
}

/* ===== 操作按钮组容器 ===== */
.stage-document-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

/* ===== 通用按钮样式（与系统一致） ===== */
.stage-document-actions .ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
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

.stage-document-actions .ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.stage-document-actions .ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 输入框通用样式 ===== */
.stage-document-actions input[type="text"] {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  height: 28px;
  transition: border-color 0.2s;
  background: #ffffff;
  color: #303133;
  min-width: 100px;
  width: auto;
}

.stage-document-actions input[type="text"]:focus {
  border-color: #3e63dd;
  outline: none;
}

.stage-document-actions input[type="text"]:disabled {
  background: #f5f7fa;
  color: #c0c4cc;
  cursor: not-allowed;
}

.stage-document-actions input[type="text"]::placeholder {
  color: #c0c4cc;
}

/* ===== 退回操作组合 ===== */
.stage-document-return {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

/* ===== 不适用操作组合 ===== */
.stage-document-applicability-action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

/* ===== 空状态文字（“已确认”/“暂无状态操作”） ===== */
.stage-document-actions__empty {
  font-size: 0.8rem;
  color: #909399;
  font-style: italic;
}

/* ===== 让责任人类似内联块，与其他操作对齐 ===== */
.stage-document-actions :deep(.project-stage-document-responsibility) {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

/* ============================================================ */
/* ===== 响应式适配 ===== */
/* ============================================================ */

/* 768px 以下：让输入框在窄屏时尽量占满 */
@media (max-width: 768px) {
  .stage-document-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
  }

  .stage-document-actions .ghost-button {
    justify-content: center;
    width: 100%;
  }

  .stage-document-return,
  .stage-document-applicability-action {
    flex-wrap: wrap;
  }

  .stage-document-return input[type="text"],
  .stage-document-applicability-action input[type="text"] {
    flex: 1;
    min-width: 120px;
    width: 100%;
  }

  .stage-document-return .ghost-button,
  .stage-document-applicability-action .ghost-button {
    flex: 1;
  }

  /* 责任人类组件在窄屏下也尽可能占满 */
  .stage-document-actions :deep(.project-stage-document-responsibility) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
}

/* 480px 以下：进一步缩小内边距和字体 */
@media (max-width: 480px) {
  .stage-document-card__actions {
    padding-top: 0.5rem;
  }
  .stage-document-card__actions h4 {
    font-size: 0.75rem;
  }
  .stage-document-actions .ghost-button {
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
    height: 26px;
  }
  .stage-document-actions input[type="text"] {
    font-size: 0.7rem;
    height: 26px;
    padding: 0.15rem 0.4rem;
  }
  .stage-document-actions__empty {
    font-size: 0.75rem;
  }
}
</style>