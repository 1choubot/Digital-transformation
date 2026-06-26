<template>
  <section class="panel approval-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段审批</span>
        <h3>审批状态与历史</h3>
      </div>
    </div>

    <section v-if="message" class="state-panel state-panel--inline state-panel--success">
      <p>{{ message }}</p>
    </section>

    <section v-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ errorMessage }}</p>
    </section>

    <div class="approval-stage-list">
      <article
        v-for="stage in stages"
        :key="stage.id || stage.stageKey"
        class="approval-stage"
        :class="{ 'approval-stage--current': stage.isCurrent }"
      >
        <div class="approval-stage__heading">
          <div class="approval-stage__title">
            <span class="mono">{{ String(stage.stageOrder).padStart(2, '0') }}</span>
            <strong>{{ stage.stageName }}</strong>
          </div>
          <div class="approval-stage__badges">
            <StatusBadge :status="stage.stageStatus" />
            <StatusBadge :status="stage.approvalStatus || 'not_submitted'" />
          </div>
        </div>

        <div class="approval-node-list">
          <div
            v-for="node in buildApprovalNodes(stage)"
            :key="node.key"
            class="approval-node"
            :class="`approval-node--${node.tone}`"
          >
            <span>{{ node.label }}</span>
            <strong>{{ node.statusText }}</strong>
          </div>
        </div>

        <div v-if="stage.isCurrent" class="approval-stage__summary">
          <div>
            <span>适用必填总数</span>
            <strong>{{ getStageCompleteness(stage)?.requiredTotal ?? '-' }}</strong>
          </div>
          <div>
            <span>已确认适用</span>
            <strong>{{ getStageCompleteness(stage)?.confirmedRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>未完成适用</span>
            <strong>{{ getStageCompleteness(stage)?.incompleteRequiredCount ?? '-' }}</strong>
          </div>
        </div>

        <div v-if="hasApprovalActions(stage)" class="approval-actions">
          <button
            v-if="canSubmitStageApproval(stage)"
            type="button"
            class="primary-button"
            :disabled="isPending(stage, 'submit')"
            @click="$emit('submit', stage)"
          >
            {{ isPending(stage, 'submit') ? '提交中...' : '提交审批' }}
          </button>

          <button
            v-if="canResubmitStageApproval(stage)"
            type="button"
            class="primary-button"
            :disabled="isPending(stage, 'resubmit')"
            @click="$emit('resubmit', stage)"
          >
            {{ isPending(stage, 'resubmit') ? '提交中...' : '重新提交' }}
          </button>

          <template v-if="canApproveStageApproval(stage)">
            <button
              type="button"
              class="primary-button"
              :disabled="isPending(stage, 'approve')"
              @click="$emit('approve', stage)"
            >
              {{ isPending(stage, 'approve') ? '处理中...' : '审批通过' }}
            </button>
            <label class="approval-return">
              <span>退回原因</span>
              <input
                v-model="returnComments[stage.id]"
                type="text"
                maxlength="1000"
                placeholder="填写退回原因"
              />
            </label>
            <button
              type="button"
              class="ghost-button"
              :disabled="isPending(stage, 'return')"
              @click="$emit('return', stage)"
            >
              {{ isPending(stage, 'return') ? '退回中...' : '退回' }}
            </button>
          </template>
        </div>

        <details class="approval-history">
          <summary>审批历史</summary>
          <p v-if="approvalHistoriesLoading" class="approval-history__empty">正在加载审批历史...</p>
          <p v-else-if="approvalHistoryErrors[stage.id]" class="approval-history__error">
            {{ approvalHistoryErrors[stage.id] }}
          </p>
          <p v-else-if="getApprovalHistory(stage).length === 0" class="approval-history__empty">
            暂无审批历史。
          </p>
          <ol v-else class="approval-history__list">
            <li v-for="record in getApprovalHistory(stage)" :key="record.id">
              <div>
                <time>{{ formatDateTime(record.createdAt) }}</time>
                <span>{{ formatUser(record.actorUser) }}</span>
                <span>{{ formatApprovalRole(record.actorApprovalRole) }}</span>
              </div>
              <strong>{{ formatApprovalAction(record.actionType) }}</strong>
              <span>
                {{ formatStatus(record.fromApprovalStatus) }}
                ->
                {{ formatStatus(record.toApprovalStatus) }}
              </span>
              <p v-if="record.comment">{{ record.comment }}</p>
            </li>
          </ol>
        </details>
      </article>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import {
  formatApprovalAction,
  formatApprovalRole,
  formatBusinessDepartment,
  formatDateTime,
  formatStatus,
  formatUser
} from '../../utils/format.js';

const props = defineProps({
  stages: {
    type: Array,
    default: () => []
  },
  project: {
    type: Object,
    default: null
  },
  approvalHistories: {
    type: Object,
    default: () => ({})
  },
  approvalHistoryErrors: {
    type: Object,
    default: () => ({})
  },
  approvalHistoriesLoading: {
    type: Boolean,
    default: false
  },
  returnComments: {
    type: Object,
    required: true
  },
  pendingAction: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  },
  getStageCompleteness: {
    type: Function,
    required: true
  },
  canSubmitStageApproval: {
    type: Function,
    required: true
  },
  canResubmitStageApproval: {
    type: Function,
    required: true
  },
  canApproveStageApproval: {
    type: Function,
    required: true
  }
});

defineEmits(['submit', 'resubmit', 'approve', 'return']);

const staticApprovalCenters = {
  initiation: 'marketing_center',
  solution: 'rd_center',
  contract: 'marketing_center',
  detailedDesign: 'rd_center',
  manufacturing: 'manufacturing_center',
  preAcceptance: 'manufacturing_center',
  finalAcceptance: 'manufacturing_center'
};
const generalManagerStageKeys = new Set(['initiation', 'contract', 'closeout']);

function approvalCenter(stage) {
  if (stage.stageKey === 'closeout') {
    return props.project?.projectManagerUser?.department || '';
  }

  return staticApprovalCenters[stage.stageKey] || '';
}

function formatApprovalCenter(stage) {
  return formatBusinessDepartment(approvalCenter(stage));
}

function requiresGeneralManagerApproval(stage) {
  return generalManagerStageKeys.has(stage.stageKey);
}

function buildApprovalNodes(stage) {
  const centerLabel = `${formatApprovalCenter(stage)}负责人审批`;
  const approvalStatus = stage.approvalStatus || 'not_submitted';
  const centerNode = {
    key: 'center',
    label: centerLabel,
    statusText: '未提交',
    tone: 'muted'
  };
  const generalNode = {
    key: 'general',
    label: '总经理审批',
    statusText: '未提交',
    tone: 'muted'
  };

  if (approvalStatus === 'pending_center_manager') {
    centerNode.statusText = '待审批';
    centerNode.tone = 'active';
  } else if (approvalStatus === 'returned_by_center_manager') {
    centerNode.statusText = '已退回';
    centerNode.tone = 'warn';
  } else if (
    approvalStatus === 'pending_general_manager' ||
    approvalStatus === 'returned_by_general_manager' ||
    approvalStatus === 'approved'
  ) {
    centerNode.statusText = '已通过';
    centerNode.tone = 'done';
  }

  if (approvalStatus === 'pending_general_manager') {
    generalNode.statusText = '待审批';
    generalNode.tone = 'active';
  } else if (approvalStatus === 'returned_by_general_manager') {
    generalNode.statusText = '已退回';
    generalNode.tone = 'warn';
  } else if (approvalStatus === 'approved') {
    generalNode.statusText = requiresGeneralManagerApproval(stage) ? '已通过' : '无需审批';
    generalNode.tone = 'done';
  } else if (!requiresGeneralManagerApproval(stage)) {
    generalNode.statusText = '无需审批';
    generalNode.tone = 'muted';
  }

  return requiresGeneralManagerApproval(stage) ? [centerNode, generalNode] : [centerNode];
}

function isPending(stage, action) {
  return props.pendingAction === `${stage.id}:${action}`;
}

function hasApprovalActions(stage) {
  return (
    props.canSubmitStageApproval(stage) ||
    props.canResubmitStageApproval(stage) ||
    props.canApproveStageApproval(stage)
  );
}

function getApprovalHistory(stage) {
  return props.approvalHistories[stage.id] || [];
}
</script>

<style scoped>
/* ===== 卡片容器 ===== */
.approval-panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.approval-panel:hover {
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

/* ===== 状态面板（消息/错误/成功） ===== */
.state-panel {
  padding: 0.75rem 1.5rem;
  margin: 0 1.5rem 1rem;
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

/* ===== 阶段列表 ===== */
.approval-stage-list {
  padding: 0.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ===== 单个阶段卡片 ===== */
.approval-stage {
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 1.25rem 1.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.approval-stage--current {
  border-color: #3e63dd;
  box-shadow: 0 0 0 1px #3e63dd, 0 4px 12px rgba(62, 99, 221, 0.08);
  background: #ffffff;
}

/* ===== 阶段头部 ===== */
.approval-stage__heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.approval-stage__title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.approval-stage__title .mono {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: #909399;
  background: #f4f6f9;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
}
.approval-stage__title strong {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}

.approval-stage__badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ===== 全局紧凑状态标签 ===== */
.approval-panel :deep(.status-badge),
.approval-panel :deep(.status-badge) span {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  line-height: 1.4;
  border-radius: 3px;
  white-space: nowrap;
}

/* ===== 审批节点列表（网格布局） ===== */
.approval-node-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0 0.5rem 0.25rem;
  border-top: 1px dashed #ebeef5;
  border-bottom: 1px dashed #ebeef5;
}

.approval-node {
  display: flex;
  align-items: baseline;
  gap: 0.3rem 0.6rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #606266;
}
.approval-node span {
  color: #909399;
  font-size: 0.8rem;
}
.approval-node strong {
  font-weight: 500;
  font-size: 0.9rem;
}

/* 节点状态色调 */
.approval-node--muted strong {
  color: #909399;
}
.approval-node--active strong {
  color: #3e63dd;
}
.approval-node--warn strong {
  color: #e6a23c;
}
.approval-node--done strong {
  color: #67c23a;
}

/* ===== 阶段摘要（当前阶段齐套数据） ===== */
.approval-stage__summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem 1rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid #f0f0f0;
}

.approval-stage__summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.approval-stage__summary span {
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #909399;
}
.approval-stage__summary strong {
  font-size: 0.9rem;
  font-weight: 600;
  color: #303133;
}

/* ===== 审批操作按钮组 ===== */
.approval-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #ebeef5;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
  height: 32px;
}
.primary-button:hover:not(:disabled) { background: #5275e7; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }

.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 32px;
}
.ghost-button:hover:not(:disabled) { border-color: #c6e2ff; background: #ecf5ff; color: #3e63dd; }
.ghost-button:disabled { opacity: 0.6; cursor: not-allowed; }

.approval-return {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #606266;
}
.approval-return input {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  width: 180px;
  height: 30px;
  transition: border-color 0.2s;
}
.approval-return input:focus {
  border-color: #3e63dd;
  outline: none;
}

/* ===== 审批历史（可折叠） ===== */
.approval-history {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
}

.approval-history summary {
  font-size: 0.85rem;
  font-weight: 500;
  color: #3e63dd;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.approval-history summary::-webkit-details-marker {
  display: none;
}
.approval-history summary::before {
  content: '▶';
  font-size: 0.7rem;
  transition: transform 0.2s;
}
.approval-history[open] summary::before {
  transform: rotate(90deg);
}

.approval-history__empty,
.approval-history__error {
  font-size: 0.85rem;
  color: #909399;
  padding: 0.5rem 0;
}
.approval-history__error {
  color: #f56c6c;
}

.approval-history__list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.approval-history__list li {
  font-size: 0.8rem;
  color: #606266;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 4px;
  border-left: 3px solid #ebeef5;
}

.approval-history__list li > div {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.75rem;
  margin-bottom: 0.15rem;
}
.approval-history__list li time {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  color: #909399;
}
.approval-history__list li > div span {
  font-weight: 500;
}
.approval-history__list li > div span:nth-child(2) {
  color: #303133;
}
.approval-history__list li > div span:nth-child(3) {
  background: #f4f4f5;
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  color: #606266;
}
.approval-history__list li strong {
  font-weight: 500;
  color: #3e63dd;
  margin-right: 0.5rem;
}
.approval-history__list li > span {
  font-size: 0.75rem;
  color: #909399;
}
.approval-history__list li p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #606266;
  font-style: italic;
  padding: 0.2rem 0.4rem;
  background: #f4f6f9;
  border-radius: 3px;
}

/* ============================================================ */
/* ===== 响应式：与主应用断点对齐 ===== */
/* ============================================================ */

/* 1024px 以下：摘要改为两列 */
@media (max-width: 1024px) {
  .approval-stage__summary {
    grid-template-columns: repeat(2, 1fr);
  }
  .approval-return input {
    width: 140px;
  }
}

/* 768px 以下：阶段卡片内边距缩小，节点列表纵向，摘要一列，操作按钮堆叠 */
@media (max-width: 768px) {
  .panel-heading {
    padding: 0.85rem 1rem;
  }
  .state-panel {
    margin: 0 1rem 0.75rem;
    padding: 0.5rem 1rem;
  }
  .approval-stage-list {
    padding: 0.5rem 1rem 1rem;
    gap: 1rem;
  }
  .approval-stage {
    padding: 1rem;
  }
  .approval-stage__heading {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .approval-stage__badges {
    justify-content: flex-start;
  }

  .approval-node-list {
    flex-direction: column;
    gap: 0.4rem;
  }

  .approval-stage__summary {
    grid-template-columns: 1fr;
  }

  .approval-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .approval-actions .primary-button,
  .approval-actions .ghost-button {
    width: 100%;
    justify-content: center;
  }
  .approval-return {
    flex-wrap: wrap;
  }
  .approval-return input {
    width: 100%;
  }

  .approval-history__list li > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }
}

/* 480px 以下：进一步缩小内边距 */
@media (max-width: 480px) {
  .panel-heading {
    padding: 0.75rem;
  }
  .state-panel {
    margin: 0 0.5rem 0.5rem;
    padding: 0.5rem;
  }
  .approval-stage-list {
    padding: 0.25rem 0.5rem 0.75rem;
  }
  .approval-stage {
    padding: 0.75rem;
  }
  .approval-stage__title strong {
    font-size: 0.9rem;
  }
  .approval-node {
    font-size: 0.8rem;
  }
  .approval-history__list li {
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>