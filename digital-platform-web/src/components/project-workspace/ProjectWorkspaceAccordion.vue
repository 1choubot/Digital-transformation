<template>
  <div class="project-workspace__layout" v-if="stages.length">
    <!-- 左侧阶段导航栏 -->
    <nav class="project-workspace__sidebar" role="navigation" aria-label="项目阶段导航">
      <div class="project-workspace__sidebar-heading">
        <span class="section-eyebrow">阶段导航</span>
      </div>

      <div class="project-workspace__sidebar-nav">
        <div
          v-for="stage in stages"
          :key="stage.stageKey"
          class="project-workspace__nav-group"
          :class="{
            'project-workspace__nav-group--expanded': selectedStageKey === stage.stageKey,
            'project-workspace__nav-group--current': stage.isCurrent
          }"
        >
          <button
            type="button"
            class="project-workspace__nav-header"
            :class="{ 'project-workspace__nav-header--active': selectedStageKey === stage.stageKey }"
            :aria-expanded="selectedStageKey === stage.stageKey"
            @click="$emit('select-stage', stage)"
          >
            <div class="project-workspace__nav-header-left">
              <span class="project-workspace__nav-stage-order">{{ String(stage.stageOrder).padStart(2, '0') }}</span>
              <span class="project-workspace__nav-stage-name">{{ stage.stageName }}</span>
            </div>
            <svg
              class="project-workspace__nav-chevron"
              :class="{ 'project-workspace__nav-chevron--rotated': selectedStageKey === stage.stageKey }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div
            class="project-workspace__nav-children"
            :class="{ 'project-workspace__nav-children--open': selectedStageKey === stage.stageKey }"
          >
            <div class="project-workspace__nav-children-inner">
              <template v-if="stage.nodes?.length">
                <button
                  v-for="node in stage.nodes"
                  :key="node.nodeKey"
                  type="button"
                  class="project-workspace__nav-child-item"
                  :class="{ 'project-workspace__nav-child-item--active': activeNodeKey === node.nodeKey }"
                  @click="$emit('select-node', { stage, node })"
                >
                  <span class="project-workspace__nav-child-name">{{ node.nodeName }}</span>
                  <span class="project-workspace__nav-child-badge" :class="'project-workspace__nav-child-badge--' + getStatusClass(node.nodeStatus)">
                    {{ formatWorkspaceStatus(node.nodeStatus) }}
                  </span>
                </button>
              </template>

              <div v-else class="project-workspace__nav-placeholder">
                <p>{{ stage.placeholderStatus ? formatWorkspaceStatus(stage.placeholderStatus) : '后续配置' }}</p>
                <button
                  v-if="stage.legacyChecklistAvailable"
                  type="button"
                  class="project-workspace__nav-legacy-link"
                  @click="$emit('open-legacy-checklist')"
                >
                  旧资料清单入口
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- 右侧内容区 -->
    <div class="project-workspace__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineEmits(['select-stage', 'select-node', 'open-legacy-checklist']);

defineProps({
  stages: {
    type: Array,
    default: () => []
  },
  selectedStageKey: {
    type: String,
    default: ''
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

function getStatusClass(status) {
  return {
    completed: 'done',
    in_progress: 'progress',
    waiting_submission: 'pending',
    pending_review: 'pending',
    blocked_by_rework: 'blocked',
    returned_for_rework: 'returned'
  }[status] || 'muted';
}
</script>
