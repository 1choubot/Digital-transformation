<template>
  <section class="detail-header-container">
    <!-- ===== 摘要卡片：项目身份 + 当前阶段 + 状态 ===== -->
    <article class="panel summary-card">
      <div class="summary-left">
        <div class="project-identity">
          <span class="project-code">{{ detail.project.projectCode }}</span>
          <h2 class="project-name">{{ detail.project.projectName }}</h2>
        </div>
        <span class="project-customer">{{ detail.project.customerName }}</span>
      </div>
      <div class="summary-right">
        <div class="stage-info">
          <span class="stage-label">当前阶段</span>
          <strong class="stage-name">{{ currentStageTitle }}</strong>
        </div>
        <StatusBadge :status="detail.currentStage?.stageStatus || detail.project.status" />
      </div>
    </article>

    <!-- ===== 详细信息卡片：项目属性网格 ===== -->
    <article class="panel info-card">
      <!-- 第一行：核心属性（加粗突出） -->
      <div class="info-item info-item--highlight">
        <span>项目模式</span>
        <strong>{{ formatProjectMode(detail.project.projectMode) }}</strong>
      </div>
      <div class="info-item info-item--highlight">
        <span>项目经理</span>
        <strong>{{ formatUser(detail.project.projectManagerUser) }}</strong>
      </div>
      <div class="info-item info-item--highlight">
        <span>项目状态</span>
        <StatusBadge :status="detail.project.status" />
      </div>
      <div class="info-item info-item--highlight">
        <span>参与部门</span>
        <strong>{{ formatDepartments(detail.project.participatingDepartments) }}</strong>
      </div>

      <!-- 第二行：时间与创建信息 -->
      <div class="info-item">
        <span>计划开始</span>
        <strong>{{ formatDate(detail.project.plannedStartDate) }}</strong>
      </div>
      <div class="info-item">
        <span>计划完成</span>
        <strong>{{ formatDate(detail.project.plannedEndDate) }}</strong>
      </div>
      <div class="info-item">
        <span>创建人</span>
        <strong>{{ formatUser(detail.project.createdBy) }}</strong>
      </div>
      <div class="info-item">
        <span>创建时间</span>
        <strong>{{ formatDate(detail.project.createdAt) }}</strong>
      </div>

      <!-- 备注独占一行 -->
      <div class="info-item info-item--wide">
        <span>备注</span>
        <strong class="remark-text">{{ detail.project.remark || '-' }}</strong>
      </div>
    </article>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import {
  formatDate,
  formatDepartments,
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

<style scoped>
/* ===== 全局容器 ===== */
.detail-header-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333;
}

/* ===== 卡片通用样式（与项目总览完全一致） ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  padding: 1.25rem 1.5rem;
  transition: all 0.2s ease;
}

.panel:hover {
  box-shadow: 0 8px 20px rgba(0, 21, 41, 0.06);
}

/* ===== 摘要卡片 ===== */
.summary-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  border-left: 4px solid #3e63dd;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-width: 0;
}

.project-identity {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.project-code {
  font-family: Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 500;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.project-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
  line-height: 1.3;
  word-break: break-word;
}

.project-customer {
  font-size: 0.9rem;
  color: #909399;
  background: #f4f6f9;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-shrink: 0;
}

.stage-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}

.stage-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #909399;
}

.stage-name {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}

/* ===== 信息卡片 ===== */
.info-card {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem 2rem;
}

/* ===== 信息项 ===== */
.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f4f4f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item span {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #909399;
}

.info-item strong {
  font-size: 0.9rem;
  font-weight: 500;
  color: #303133;
  word-break: break-word;
}

/* 高亮项（核心属性） */
.info-item--highlight {
  background: #f8fafc;
  border-radius: 4px;
  padding: 0.4rem 0.75rem;
  border-bottom: none;
}

.info-item--highlight span {
  color: #606266;
}

.info-item--highlight strong {
  font-weight: 600;
}

/* 备注独占一行 */
.info-item--wide {
  grid-column: 1 / -1;
  border-bottom: none;
  padding-top: 0.25rem;
}

.remark-text {
  color: #606266 !important;
  font-weight: 400 !important;
  font-size: 0.85rem !important;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .summary-card {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .summary-right {
    justify-content: space-between;
  }

  .stage-info {
    align-items: flex-start;
  }

  .info-card {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1.5rem;
  }
}

@media (max-width: 600px) {
  .info-card {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .summary-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .project-identity {
    width: 100%;
  }

  .project-name {
    font-size: 1.1rem;
  }

  .stage-name {
    font-size: 0.9rem;
  }

  .summary-right {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .info-item--highlight {
    padding: 0.3rem 0.6rem;
  }
}
</style>