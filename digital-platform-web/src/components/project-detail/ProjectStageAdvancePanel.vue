<template>
  <section class="panel stage-advance-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段推进</span>
        <h3>手工推进阶段</h3>
        <p class="manual-status-note">
          阶段推进基于当前手工状态和人工适用性判断，只推进当前阶段，不代表文件已上传或已归档。
        </p>
      </div>
      <button
        v-if="currentStage && showAdvanceAction"
        type="button"
        class="primary-button"
        :disabled="!canAdvanceCurrentStage || pending"
        @click="$emit('advance')"
      >
        {{ pending ? '推进中...' : '推进当前阶段' }}
      </button>
    </div>

    <div class="stage-advance-content">
      <section v-if="message" class="state-panel state-panel--inline state-panel--success">
        <p>{{ message }}</p>
      </section>

      <section v-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <template v-if="isProjectCompleted">
        <p class="stage-advance-status">项目已完成，当前阶段为空，无需继续推进。</p>
      </template>

      <template v-else-if="currentStage">
        <div class="stage-advance-current">
          <div>
            <span>当前阶段</span>
            <strong>{{ currentStage.stageName }}</strong>
          </div>
          <div class="stage-advance-current__badges">
            <StatusBadge :status="currentStage.stageStatus" />
            <StatusBadge :status="currentStage.approvalStatus || 'not_submitted'" />
          </div>
        </div>

        <div class="stage-advance-summary">
          <div>
            <span>适用必填总数</span>
            <strong>{{ currentStageCompleteness?.requiredTotal ?? '-' }}</strong>
          </div>
          <div>
            <span>已确认适用</span>
            <strong>{{ currentStageCompleteness?.confirmedRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>未完成适用</span>
            <strong>{{ currentStageCompleteness?.incompleteRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>完成百分比</span>
            <strong>{{ currentStageCompleteness ? `${currentStageCompleteness.completionPercent}%` : '-' }}</strong>
          </div>
          <div>
            <span>审批状态</span>
            <strong>{{ formatStatus(currentStage.approvalStatus || 'not_submitted') }}</strong>
          </div>
        </div>

        <div class="stage-advance-missing">
          <strong>当前阶段缺失适用必填资料</strong>
          <ul v-if="missingDocuments.length > 0">
            <li v-for="document in missingDocuments" :key="document.id || document.documentCode">
              <span class="mono">{{ document.documentCode }}</span>
              <span>{{ document.documentName }}</span>
              <StatusBadge :status="document.status" />
            </li>
          </ul>
          <p v-else>当前阶段暂无缺失适用必填资料。</p>
        </div>

        <p v-if="currentStage && currentStage.approvalStatus !== 'approved'" class="stage-advance-blocked">
          当前阶段审批未通过，不能推进。请先完成阶段审批。
        </p>
        <p v-else-if="currentStageCompleteness && !canAdvanceCurrentStage" class="stage-advance-blocked">
          当前阶段未齐套，不能推进。请先完成或标记不适用缺失的适用必填资料。
        </p>
        <p v-else-if="!currentStageCompleteness" class="stage-advance-blocked">
          正在读取当前阶段齐套情况，暂不能推进。
        </p>
      </template>

      <template v-else>
        <p class="stage-advance-status">当前阶段为空，暂不能推进。</p>
      </template>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import { formatStatus } from '../../utils/format.js';

defineEmits(['advance']);

defineProps({
  currentStage: {
    type: Object,
    default: null
  },
  isProjectCompleted: {
    type: Boolean,
    default: false
  },
  currentStageCompleteness: {
    type: Object,
    default: null
  },
  missingDocuments: {
    type: Array,
    default: () => []
  },
  canAdvanceCurrentStage: {
    type: Boolean,
    default: false
  },
  showAdvanceAction: {
    type: Boolean,
    default: true
  },
  pending: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
/* ===== 卡片容器 ===== */
.stage-advance-panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.stage-advance-panel:hover {
  box-shadow: 0 8px 20px rgba(0, 21, 41, 0.06);
}

/* ===== 面板头部 ===== */
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
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
  margin: 0 0 0.25rem 0;
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

.manual-status-note {
  font-size: 0.8rem;
  color: #909399;
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}

/* ===== 推进按钮 ===== */
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
  height: 36px;
  flex-shrink: 0;
}
.primary-button:hover:not(:disabled) { background: #5275e7; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== 内容区域 ===== */
.stage-advance-content {
  padding: 1rem 1.5rem 1.5rem;
}

/* ===== 状态面板（消息/错误/成功） ===== */
.state-panel {
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  text-align: center;
}
.state-panel--success {
  background: #f0f9eb;
  color: #67c23a;
}
.state-panel--error {
  background: #fef0f0;
  color: #f56c6c;
}
.state-panel p {
  margin: 0;
  font-size: 0.9rem;
}

/* ===== 当前阶段信息 ===== */
.stage-advance-current {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1rem;
}

.stage-advance-current > div:first-child {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.stage-advance-current > div:first-child span {
  font-size: 0.8rem;
  color: #909399;
}
.stage-advance-current > div:first-child strong {
  font-size: 1.05rem;
  font-weight: 600;
  color: #303133;
}

.stage-advance-current__badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ===== 缩小状态标签（解决“待提交”过宽） ===== */
.stage-advance-panel :deep(.status-badge),
.stage-advance-panel :deep(.status-badge) span {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  line-height: 1.4;
  border-radius: 3px;
  white-space: nowrap;
}

/* ===== 齐套数据汇总（5列网格） ===== */
.stage-advance-summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem 1rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0;
}

.stage-advance-summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #f4f4f5;
}
.stage-advance-summary > div:last-child {
  border-bottom: none;
}

.stage-advance-summary span {
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #909399;
}

.stage-advance-summary strong {
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
}

/* ===== 缺失资料列表 ===== */
.stage-advance-missing {
  margin: 1rem 0 1.25rem;
  padding: 0.75rem 1rem;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.stage-advance-missing > strong {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #303133;
  margin-bottom: 0.5rem;
}

.stage-advance-missing ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stage-advance-missing li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #606266;
  padding: 0.15rem 0;
  border-bottom: 1px dashed #f0f0f0;
}
.stage-advance-missing li:last-child {
  border-bottom: none;
}

.stage-advance-missing .mono {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  border-radius: 3px;
  padding: 0.05rem 0.4rem;
  flex-shrink: 0;
}

.stage-advance-missing li span:nth-child(2) {
  flex: 1;
  min-width: 80px;
  word-break: break-word;
}

/* 缺失资料中的状态标签同样紧凑 */
.stage-advance-missing :deep(.status-badge) {
  font-size: 0.65rem;
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
}

.stage-advance-missing p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #909399;
}

/* ===== 阻止推进提示 ===== */
.stage-advance-blocked {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: #fef6f0;
  border-radius: 4px;
  border-left: 4px solid #e6a23c;
  font-size: 0.9rem;
  color: #e6a23c;
}

/* ===== 状态提示（无阶段/已完成） ===== */
.stage-advance-status {
  font-size: 0.9rem;
  color: #909399;
  padding: 0.5rem 0;
}

/* ============================================================ */
/* ===== 响应式：与主应用断点对齐 ===== */
/* ============================================================ */

/* 1024px 以下：齐套数据改为3列 */
@media (max-width: 1024px) {
  .stage-advance-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 768px 以下：头部堆叠，齐套数据改为2列，当前阶段改为纵向 */
@media (max-width: 768px) {
  .panel-heading {
    flex-direction: column;
    align-items: stretch;
    padding: 0.85rem 1rem;
  }
  .primary-button {
    align-self: flex-start;
  }

  .stage-advance-content {
    padding: 0.75rem 1rem 1rem;
  }

  .stage-advance-current {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .stage-advance-current__badges {
    justify-content: flex-start;
  }

  .stage-advance-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem 0.75rem;
  }

  .stage-advance-missing li {
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
  }
}

/* 480px 以下：齐套数据改为1列，内边距更小 */
@media (max-width: 480px) {
  .panel-heading {
    padding: 0.75rem;
  }
  .stage-advance-content {
    padding: 0.5rem 0.75rem 0.75rem;
  }

  .stage-advance-summary {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }
  .stage-advance-summary > div {
    border-bottom: 1px solid #f4f4f5;
    padding: 0.2rem 0;
  }

  .stage-advance-missing {
    padding: 0.5rem 0.75rem;
  }
  .stage-advance-missing li {
    font-size: 0.8rem;
  }

  .stage-advance-blocked {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }
}
</style>