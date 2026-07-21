<template>
  <h4>启动项目流程</h4>
  <section class="project-workspace__detail initiation-node-page">
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

</script>
