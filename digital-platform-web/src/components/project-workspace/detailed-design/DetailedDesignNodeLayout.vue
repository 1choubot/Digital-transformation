<template>
  <section class="detailed-node-page" v-loading="loading">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-empty
      v-else-if="!loading && (!workflow || !node)"
      description="当前项目未返回该详细设计节点"
    />
    <template v-else-if="workflow && node">
      <section class="detailed-node-card">
        <slot name="title-after" />
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
defineProps({
  workflow: Object,
  node: Object,
  loading: Boolean,
  errorMessage: String
});
</script>

<style scoped>
.detailed-node-page {
  min-width: 0;
}

.detailed-node-card {
  display: grid;
  gap: 12px;
  min-width: 0;
}
</style>
