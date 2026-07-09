<template>
  <section class="project-workspace__detail initiation-node-page">
    <div class="project-workspace__detail-heading">
      <div>
        <span class="section-eyebrow">立项阶段</span>
        <h3>项目输入</h3>
      </div>
      <span class="stage-document-pill">{{ formatWorkspaceStatus(node?.nodeStatus) }}</span>
    </div>

    <dl class="stage-document-meta">
      <div>
        <dt>项目名称</dt>
        <dd>{{ input.projectName || project?.projectName || '-' }}</dd>
      </div>
      <div>
        <dt>项目编号</dt>
        <dd>{{ input.projectCode || project?.projectCode || '待在 1.3 填写' }}</dd>
      </div>
      <div>
        <dt>客户</dt>
        <dd>{{ input.customerName || project?.customerName || '-' }}</dd>
      </div>
      <div>
        <dt>客户联系人</dt>
        <dd>{{ input.customerContactPerson || project?.customerContactPerson || '-' }}</dd>
      </div>
      <div>
        <dt>客户联系方式</dt>
        <dd>{{ input.customerContact || project?.customerContact || '-' }}</dd>
      </div>
      <div>
        <dt>商务负责人</dt>
        <dd>{{ formatUser(input.businessResponsibleUser || project?.businessResponsibleUser) }}</dd>
      </div>
      <div>
        <dt>技术负责人</dt>
        <dd>{{ formatUser(input.technicalResponsibleUser || project?.technicalResponsibleUser) }}</dd>
      </div>
      <div>
        <dt>当前阶段</dt>
        <dd>{{ stage?.stageName || '-' }}</dd>
      </div>
    </dl>

    <div v-if="node?.blockingReasons?.length" class="stage-document-missing">
      <strong>节点阻塞</strong>
      <ul>
        <li v-for="reason in node.blockingReasons" :key="reason">{{ reason }}</li>
      </ul>
    </div>

    <section class="state-panel state-panel--inline">
      <p>项目输入节点只展示立项基础信息；项目需求、立项审批和立项通知分别在后续节点处理。</p>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';

defineEmits(['business-state-changed']);

const props = defineProps({
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
  }
});

const input = computed(() => props.node?.projectInput || {});

function formatUser(user) {
  if (!user) {
    return '-';
  }

  return user.name || user.displayName || user.account || `用户 ${user.id}`;
}

function formatWorkspaceStatus(status) {
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待处理',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    process_node: '过程节点'
  }[status] || status || '-';
}
</script>
