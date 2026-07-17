<template>
  <section class="solution-node-page" v-loading="loading">
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
      <section class="solution-node-card">
        <header class="solution-node-header">
          <div>
            <span class="section-eyebrow">合同签订 workflow</span>
            <h3>{{ node.nodeName }}</h3>
          </div>
          <el-tag :type="contractNodeStatusTagType(node.status)">
            {{ contractNodeStatusText[node.status] || node.status }}
          </el-tag>
        </header>

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
