<template>
  <section class="project-workspace__detail blank-node-page">
    <div class="project-workspace__detail-heading">
      <div>
        <span class="section-eyebrow">{{ stage?.stageName || '项目节点' }}</span>
        <h3>{{ node?.nodeName || pageTitle }}</h3>
      </div>
      <!-- <el-tag v-if="node?.nodeStatus" :type="nodeStatusTagType(node.nodeStatus)">
        {{ formatNodeStatus(node.nodeStatus) }}
      </el-tag> -->
    </div>

    <section class="state-panel state-panel--inline">
      <p>该节点专属页面正在开发中。</p>
    </section>
  </section>
</template>

<script setup>
defineEmits(['business-state-changed']);

defineProps({
  projectId: {
    type: String,
    required: true
  },
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  project: {
    type: Object,
    default: null
  },
  workspace: {
    type: Object,
    default: null
  },
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  nodeCode: {
    type: String,
    default: ''
  },
  nodePageContext: {
    type: Object,
    default: () => ({})
  },
  pageTitle: {
    type: String,
    default: '节点页面'
  }
});

function formatNodeStatus(status) {
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待处理',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    not_configured: '未配置',
    not_applicable: '不适用',
    process_node: '过程节点'
  }[status] || status || '-';
}

function nodeStatusTagType(status) {
  if (status === 'completed') return 'success';
  if (status === 'pending_review') return 'warning';
  if (['blocked_by_rework', 'returned_for_rework'].includes(status)) return 'danger';
  if (['not_configured', 'not_applicable', 'process_node'].includes(status)) return 'info';
  return 'primary';
}
</script>
