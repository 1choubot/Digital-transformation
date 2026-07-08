<template>
  <el-aside class="project-process-sidebar" width="260px" aria-label="项目流程树">
    <div class="project-process-sidebar__project">
      <strong>{{ projectTitle }}</strong>
      <small>{{ formatProjectMode(navigation?.projectMode) }} · {{ navigation?.progress ?? 0 }}%</small>
      <el-progress
        :percentage="navigation?.progress ?? 0"
        :show-text="false"
        :stroke-width="6"
      />
    </div>

    <el-menu
      class="project-process-menu"
      :default-active="selectedNodeKey || selectedStageKey"
      :default-openeds="openStageKeys"
    >
      <el-sub-menu
        v-for="stage in navigation?.children || []"
        :key="stage.stageKey"
        :index="stage.stageKey"
        @click="$emit('select-stage', stage)"
      >
        <template #title>
          <span class="project-process-menu__stage-title">{{ stage.name }}</span>
          <el-tag
            class="project-process-menu__tag"
            size="small"
            :type="statusTagType(stage.status)"
            effect="plain"
          >
            {{ formatNavigationStatus(stage.status) }}
          </el-tag>
        </template>
        <el-menu-item
          v-for="node in stage.children"
          :key="node.nodeCode"
          :index="node.nodeCode"
          @click="$emit('select-node', { stage, node })"
        >
          <span>{{ node.name }}</span>
          <el-tag size="small" :type="statusTagType(node.status)" effect="plain">
            {{ formatNavigationStatus(node.status) }}
          </el-tag>
        </el-menu-item>
        <el-menu-item v-if="!stage.children?.length" :index="`${stage.stageKey}:empty`" disabled>
          该阶段节点后续配置
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue';

defineEmits(['select-stage', 'select-node']);

const props = defineProps({
  navigation: {
    type: Object,
    default: null
  },
  selectedStageKey: {
    type: String,
    default: ''
  },
  selectedNodeKey: {
    type: String,
    default: ''
  }
});

const projectTitle = computed(() => {
  const code = props.navigation?.projectCode;
  const name = props.navigation?.projectName || '项目工作区';
  return code ? `${code} / ${name}` : name;
});

const openStageKeys = computed(() => (props.navigation?.children || []).map((stage) => stage.stageKey));

function formatProjectMode(projectMode) {
  return {
    self_developed: '自研模式',
    supplier: '供货商模式',
    outsourced: '外协模式'
  }[projectMode] || '默认模式';
}

function formatNavigationStatus(status) {
  return {
    PENDING: '未开始',
    PROCESSING: '进行中',
    COMPLETED: '已完成',
    WAIT_APPROVAL: '待审核',
    RETURNED: '退回整改',
    FAILED: '异常'
  }[status] || status || '-';
}

function statusTagType(status) {
  return {
    PROCESSING: 'success',
    COMPLETED: 'success',
    WAIT_APPROVAL: 'warning',
    RETURNED: 'danger',
    FAILED: 'danger',
    PENDING: 'info'
  }[status] || 'info';
}
</script>
