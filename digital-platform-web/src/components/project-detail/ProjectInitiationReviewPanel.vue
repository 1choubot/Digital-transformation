<template>
  <section v-if="review" class="initiation-review-panel" aria-label="1.2 项目立项评价与最终审批">
    <div class="initiation-review-panel__heading">
      <div>
        <h4>1.2 评价与最终审批</h4>
        <p>{{ overallText }}</p>
      </div>
      <span class="stage-document-pill" :class="{ 'stage-document-pill--success': review.isComplete }">
        {{ review.isComplete ? '最终通过' : '未最终通过' }}
      </span>
    </div>

    <ul v-if="blockingReasons.length > 0" class="initiation-review-blockers">
      <li v-for="reason in blockingReasons" :key="reason">{{ reason }}</li>
    </ul>

    <div class="initiation-review-nodes">
      <article v-for="node in nodes" :key="node.nodeKey" class="initiation-review-node">
        <div class="initiation-review-node__main">
          <strong>{{ node.nodeName || formatNodeName(node.nodeKey) }}</strong>
          <span class="stage-document-pill">{{ formatNodeStatus(node.nodeStatus) }}</span>
        </div>
        <dl class="initiation-review-node__meta">
          <div>
            <dt>{{ isEvaluationNode(node) ? '评价角色' : '审批角色' }}</dt>
            <dd>{{ formatNodeReviewer(node) }}</dd>
          </div>
          <div>
            <dt>{{ isEvaluationNode(node) ? '评价文本' : '审批意见' }}</dt>
            <dd>{{ node.comment || node.returnReason || '-' }}</dd>
          </div>
          <div>
            <dt>操作时间</dt>
            <dd>{{ formatDateTime(node.reviewedAt || node.submittedAt || node.invalidatedAt) }}</dd>
          </div>
        </dl>

        <div v-if="node.canAct" class="initiation-review-actions">
          <template v-if="isEvaluationNode(node)">
            <input
              v-model.trim="nodeComments[node.nodeKey]"
              type="text"
              placeholder="评价文本"
              :disabled="isNodePending(node, 'approve')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isNodePending(node, 'approve') || !nodeComments[node.nodeKey]"
              @click="$emit('approve-node', { document, node, comment: nodeComments[node.nodeKey] || '' })"
            >
              {{ isNodePending(node, 'approve') ? '提交中...' : '提交评价' }}
            </button>
          </template>
          <template v-else>
            <input
              v-model.trim="nodeComments[node.nodeKey]"
              type="text"
              placeholder="审批意见"
              :disabled="isNodePending(node, 'approve') || isNodePending(node, 'return')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isNodePending(node, 'approve')"
              @click="$emit('approve-node', { document, node, comment: nodeComments[node.nodeKey] || '' })"
            >
              {{ isNodePending(node, 'approve') ? '处理中...' : '审批通过' }}
            </button>
            <input
              v-model.trim="nodeReturnReasons[node.nodeKey]"
              type="text"
              placeholder="审批不通过意见"
              :disabled="isNodePending(node, 'approve') || isNodePending(node, 'return')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isNodePending(node, 'return') || !nodeReturnReasons[node.nodeKey]"
              @click="$emit('return-node', { document, node, returnReason: nodeReturnReasons[node.nodeKey] })"
            >
              {{ isNodePending(node, 'return') ? '处理中...' : '审批不通过' }}
            </button>
          </template>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue';
import {
  formatBusinessDepartment,
  formatDateTime,
  formatOrganizationRole,
  formatUser
} from '../../utils/format.js';

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  isActionPending: {
    type: Function,
    required: true
  }
});

defineEmits(['approve-node', 'return-node']);

const nodeComments = reactive({});
const nodeReturnReasons = reactive({});

const review = computed(() => props.document.initiationReview || null);
const nodes = computed(() => review.value?.nodes || []);
const blockingReasons = computed(() => review.value?.blockingReasons || []);
const overallText = computed(() => {
  if (review.value?.isComplete) {
    return '营销评价、研发评价均已完成，总经理已审批通过。';
  }

  if (review.value?.blockedByRework) {
    return '1.1 返工未清除，1.2 暂不能最终完成。';
  }

  return '等待营销评价、研发评价和总经理最终审批完成。';
});

function formatNodeName(nodeKey) {
  if (nodeKey === 'business_review') {
    return '营销评价';
  }

  if (nodeKey === 'technical_review') {
    return '研发评价';
  }

  if (nodeKey === 'general_review') {
    return '总经理审批';
  }

  return nodeKey || '-';
}

function formatNodeStatus(status) {
  return {
    waiting_document_submission: '等待 1.2 资料提交',
    pending: '待处理',
    approved: '已完成',
    returned_blocked_by_rework: '审批不通过，返工阻塞',
    waiting_prerequisite: '等待评价完成',
    invalidated: '已失效，待前置重跑'
  }[status] || status || '-';
}

function formatNodeReviewer(node) {
  if (node.reviewerUser) {
    return formatUser(node.reviewerUser);
  }

  const role = formatOrganizationRole(node.reviewerRole);
  const department = node.reviewerDepartment ? formatBusinessDepartment(node.reviewerDepartment) : '';
  return [department, role].filter(Boolean).join(' / ') || '-';
}

function isNodePending(node, action) {
  return props.isActionPending(props.document.id, `initiation-${node.nodeKey}-${action}`);
}

function isEvaluationNode(node) {
  return ['business_review', 'technical_review'].includes(node?.nodeKey);
}
</script>
