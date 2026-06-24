<template>
  <section class="panel approval-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段关口审批</span>
        <h3>阶段关口审批状态与历史</h3>
        <p class="manual-status-note">
          适用必填资料需先全部通过资料级审核，项目经理才能提交当前阶段关口审批。
          总经理审批属于阶段关口审批，不审核单个资料项。
        </p>
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
            <span>已审核通过适用</span>
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
            {{ isPending(stage, 'submit') ? '提交中...' : '提交阶段关口审批' }}
          </button>

          <button
            v-if="canResubmitStageApproval(stage)"
            type="button"
            class="primary-button"
            :disabled="isPending(stage, 'resubmit')"
            @click="$emit('resubmit', stage)"
          >
            {{ isPending(stage, 'resubmit') ? '提交中...' : '重新提交阶段关口审批' }}
          </button>

          <template v-if="canApproveStageApproval(stage)">
            <button
              type="button"
              class="primary-button"
              :disabled="isPending(stage, 'approve')"
              @click="$emit('approve', stage)"
            >
              {{ isPending(stage, 'approve') ? '处理中...' : '阶段关口审批通过' }}
            </button>
            <label class="approval-return">
              <span>阶段关口审批退回原因</span>
              <input
                v-model="returnComments[stage.id]"
                type="text"
                maxlength="1000"
                placeholder="填写阶段关口审批退回原因"
              />
            </label>
            <button
              type="button"
              class="ghost-button"
              :disabled="isPending(stage, 'return')"
              @click="$emit('return', stage)"
            >
              {{ isPending(stage, 'return') ? '退回中...' : '退回阶段关口审批' }}
            </button>
          </template>
        </div>

        <details class="approval-history">
          <summary>阶段关口审批历史</summary>
          <p v-if="approvalHistoriesLoading" class="approval-history__empty">正在加载阶段关口审批历史...</p>
          <p v-else-if="approvalHistoryErrors[stage.id]" class="approval-history__error">
            {{ approvalHistoryErrors[stage.id] }}
          </p>
          <p v-else-if="getApprovalHistory(stage).length === 0" class="approval-history__empty">
            暂无阶段关口审批历史。
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
  const centerLabel = `${formatApprovalCenter(stage)}负责人关口审批`;
  const approvalStatus = stage.approvalStatus || 'not_submitted';
  const centerNode = {
    key: 'center',
    label: centerLabel,
    statusText: '未提交',
    tone: 'muted'
  };
  const generalNode = {
    key: 'general',
    label: '总经理关口审批',
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
