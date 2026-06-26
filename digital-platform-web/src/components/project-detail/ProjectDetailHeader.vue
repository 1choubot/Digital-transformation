<template>
  <section class="detail-grid">
    <article class="panel detail-summary">
      <div>
        <span class="section-eyebrow">当前阶段</span>
        <h3>{{ currentStageTitle }}</h3>
        <StatusBadge :status="detail.currentStage?.stageStatus || detail.project.status" />
      </div>
      <p>{{ formatProjectCode(detail.project.projectCode) }} · {{ detail.project.customerName }}</p>
    </article>

    <article class="panel info-list">
      <div><span>项目编号</span><strong>{{ formatProjectCode(detail.project.projectCode) }}</strong></div>
      <div><span>项目名称</span><strong>{{ detail.project.projectName }}</strong></div>
      <div><span>客户</span><strong>{{ detail.project.customerName }}</strong></div>
      <div><span>项目模式</span><strong>{{ formatProjectMode(detail.project.projectMode) }}</strong></div>
      <div><span>项目经理</span><strong>{{ formatUser(detail.project.projectManagerUser) }}</strong></div>
      <div><span>参与部门</span><strong>{{ formatDepartments(detail.project.participatingDepartments) }}</strong></div>
      <div><span>项目状态</span><StatusBadge :status="detail.project.status" /></div>
      <div><span>创建人</span><strong>{{ formatUser(detail.project.createdBy) }}</strong></div>
      <div><span>计划开始</span><strong>{{ formatDate(detail.project.plannedStartDate) }}</strong></div>
      <div><span>计划完成</span><strong>{{ formatDate(detail.project.plannedEndDate) }}</strong></div>
      <div class="info-list__wide"><span>备注</span><strong>{{ detail.project.remark || '-' }}</strong></div>
    </article>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import {
  formatDate,
  formatDepartments,
  formatProjectCode,
  formatProjectMode,
  formatUser
} from '../../utils/format.js';

defineProps({
  detail: {
    type: Object,
    required: true
  },
  currentStageTitle: {
    type: String,
    required: true
  }
});
</script>
