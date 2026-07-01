<template>
  <section class="project-workspace__node-section">
    <div class="project-workspace__section-heading">
      <div>
        <span class="section-eyebrow">当前阶段</span>
        <h3>{{ stage?.stageName || '阶段内容' }}</h3>
      </div>
      <span class="stage-document-pill">{{ formatStageStatus(stage) }}</span>
    </div>

    <div v-if="stage?.nodes?.length" class="project-workspace__node-grid">
      <button
        v-for="node in stage.nodes"
        :key="node.nodeKey"
        type="button"
        class="project-workspace__node-card"
        :class="{ 'project-workspace__node-card--active': activeNodeKey === node.nodeKey }"
        @click="$emit('select-node', node)"
      >
        <strong>{{ node.nodeName }}</strong>
        <span>{{ formatWorkspaceStatus(node.nodeStatus) }}</span>
        <small v-if="node.outputs?.length">{{ node.outputs.length }} 个关联产出</small>
        <small v-else>基础信息节点</small>
      </button>
    </div>

    <section v-else class="project-workspace__placeholder">
      <strong>{{ stage?.placeholderStatus ? formatWorkspaceStatus(stage.placeholderStatus) : '后续配置' }}</strong>
      <p>{{ stage?.placeholderText || '本阶段蓝色节点和产出映射后续配置。' }}</p>
      <button
        v-if="stage?.legacyChecklistAvailable"
        type="button"
        class="ghost-button project-workspace__legacy-link"
        @click="$emit('open-legacy-checklist')"
      >
        查看旧资料清单入口
      </button>
    </section>

    <p v-if="stage?.nodes?.length && !activeNodeKey" class="project-workspace__hint">
      请选择蓝色节点查看关联产出；不会在点击节点前直接打开在线表单。
    </p>
  </section>
</template>

<script setup>
defineEmits(['select-node', 'open-legacy-checklist']);

defineProps({
  stage: {
    type: Object,
    default: null
  },
  activeNodeKey: {
    type: String,
    default: ''
  }
});

function formatWorkspaceStatus(status) {
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待处理',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    not_configured: '未配置',
    legacy_checklist_available: '旧清单入口'
  }[status] || status || '-';
}

function formatStageStatus(stage) {
  if (!stage) {
    return '-';
  }

  if (stage.configured) {
    return '已配置节点';
  }

  return stage.legacyChecklistAvailable ? '旧清单入口' : '后续配置';
}
</script>
