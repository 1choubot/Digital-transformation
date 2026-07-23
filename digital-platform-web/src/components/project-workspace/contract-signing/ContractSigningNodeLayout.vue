<template>
  <section class="contract-signing-node-page" v-loading="loading">
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    />
    <el-empty
      v-else-if="!loading && (!workflow || !node)"
      description="当前项目未返回该合同签订节点"
    />
    <template v-else-if="workflow && node">
      <section class="contract-signing-node-card">

        <el-alert
          v-if="workflow.isProjectEnded"
          title="项目已结束，合同阶段写操作已关闭。"
          type="info"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="node.returnReason"
          :title="`退回原因：${node.returnReason}`"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="node.blockingReasons?.length"
          :title="`阻塞原因：${node.blockingReasons.join('；')}`"
          type="warning"
          show-icon
          :closable="false"
        />

        <slot />
      </section>
    </template>
  </section>
</template>

<script setup>
import {
  contractNodeStatusTagType,
  contractNodeStatusText
} from '../../../composables/project-stage/contract-signing/contractSigningFormatters.js';

defineProps({
  projectId: {
    type: String,
    required: true
  },
  workflow: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  stage: {
    type: Object,
    default: null
  },
  loading: Boolean,
  errorMessage: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.contract-signing-node-page,
.contract-signing-node-card {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.contract-signing-node-page {
  display: grid;
  gap: var(--app-space-4);
  min-height: 180px;
}

.contract-signing-node-card {
  display: grid;
  align-content: start;
  gap: var(--app-space-4);
}

.contract-signing-node-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--app-space-3);
  padding-bottom: var(--app-space-3);
  border-bottom: 1px solid var(--app-border);
}

.contract-signing-node-header > div {
  display: grid;
  gap: var(--app-space-1);
  min-width: 0;
}

.contract-signing-node-header h3 {
  margin: 0;
  color: var(--app-text-primary);
  font-size: 20px;
  line-height: 1.35;
}
</style>
