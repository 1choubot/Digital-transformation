<template>
  <section class="page-stack">
    <!-- 精简标题行 -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目台账</span>
        <h2>项目列表</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects/new')">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        新建项目
      </button>
    </div>

    <section class="panel">
      <div class="panel-toolbar">
        <div>
          <strong>后端数据源</strong>
          <span>{{ apiBaseUrl }}</span>
        </div>
        <button type="button" class="ghost-button" :disabled="loading" @click="loadProjects">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {{ loading ? '加载中...' : '重新加载' }}
        </button>
      </div>

      <div v-if="loading" class="state-panel state-panel--inline">
        <p>正在加载项目数据...</p>
      </div>

      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <h3>项目列表加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" class="primary-button" @click="loadProjects">重试</button>
      </div>

      <div v-else-if="projects.length === 0" class="state-panel state-panel--inline">
        <h3>暂无项目</h3>
        <p>还没有创建任何项目，点击下方按钮开始创建。</p>
        <button type="button" class="primary-button" @click="navigate('/projects/new')">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          新建项目
        </button>
      </div>

      <div v-else class="project-table">
        <div class="project-table__head">
          <span>项目编号</span>
          <span>项目名称</span>
          <span>客户</span>
          <span>项目经理</span>
          <span>项目状态</span>
          <span>当前阶段</span>
          <span>创建人</span>
          <span>计划时间</span>
          <span>操作</span>
        </div>

        <article v-for="project in projects" :key="project.id" class="project-table__row">
          <div class="project-cell project-cell--code">
            <span class="mono">{{ project.projectCode }}</span>
          </div>
          <div class="project-cell project-cell--name">
            <strong>{{ project.projectName }}</strong>
          </div>
          <div class="project-cell">
            <span>{{ project.customerName }}</span>
          </div>
          <div class="project-cell">
            <span>{{ project.projectManager }}</span>
          </div>
          <div class="project-cell">
            <StatusBadge :status="project.status" />
          </div>
          <div class="project-cell">
            <span>{{ project.currentStage?.stageName || '-' }}</span>
          </div>
          <div class="project-cell">
            <span>{{ formatUser(project.createdBy) }}</span>
          </div>
          <div class="project-cell project-cell--date">
            <time>{{ formatDate(project.plannedStartDate) }}</time>
            <span class="date-separator">至</span>
            <time>{{ formatDate(project.plannedEndDate) }}</time>
          </div>
          <div class="project-cell project-cell--action">
            <button type="button" class="ghost-button" @click="navigate(`/projects/${project.id}`)">查看详情</button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { getApiBaseUrlLabel, listProjects, toReadableApiError } from '../api/projects.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatUser } from '../utils/format.js';

const props = defineProps({
  authToken: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    required: true
  },
  navigate: {
    type: Function,
    required: true
  }
});

const apiBaseUrl = getApiBaseUrlLabel();
const loading = ref(false);
const errorMessage = ref('');
const projects = ref([]);

async function loadProjects() {
  loading.value = true;
  errorMessage.value = '';

  try {
    projects.value = await listProjects(props.authToken);
  } catch (error) {
    errorMessage.value = toReadableApiError(error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadProjects);
</script>

<style scoped>
/* ===== 全局重置 & 基础 ===== */
.page-stack {
  max-width: 1440px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background: #f8fafc;
  min-height: 100vh;
}

/* ===== 标题行 ===== */
.page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.section-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.page-title-row h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.3;
}

.page-user {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 400;
}

/* ===== 按钮 ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.4rem 1rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.ghost-button:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #0f172a;
  border: none;
  padding: 0.6rem 1.6rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.primary-button:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

/* ===== 面板 ===== */
.panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 1.25rem 1.5rem;
  margin-bottom: 0;
  transition: box-shadow 0.2s ease;
}

.panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* ===== 工具栏 ===== */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #f1f5f9;
}

.panel-toolbar strong {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-right: 0.6rem;
}

.panel-toolbar span {
  color: #64748b;
  font-size: 0.8rem;
}

/* ===== 状态面板 ===== */
.state-panel {
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.state-panel--inline {
  padding: 2rem 1.5rem;
  min-height: 180px;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.state-panel h3 {
  margin: 0 0 0.35rem 0;
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.state-panel p {
  color: #64748b;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.state-panel--error p {
  color: #b91c1c;
}

.state-panel .primary-button {
  margin-top: 0.25rem;
}

/* ===== 表格 ===== */
.project-table {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.project-table__head {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr 1.1fr 0.9fr 0.9fr 0.9fr 1.3fr 0.8fr;
  gap: 0.4rem 0.6rem;
  padding: 0.5rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 8px;
  align-items: center;
}

.project-table__row {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr 1.1fr 0.9fr 0.9fr 0.9fr 1.3fr 0.8fr;
  gap: 0.4rem 0.6rem;
  padding: 0.6rem 0.6rem;
  background: white;
  border-radius: 8px;
  align-items: center;
  transition: background 0.15s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
}

.project-table__row:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* ===== 单元格 ===== */
.project-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.project-cell--name strong {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.85rem;
  word-break: break-word;
}

.project-cell--date {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem 0.25rem;
}

.project-cell--date time {
  font-size: 0.75rem;
  color: #475569;
}

.project-cell--date .date-separator {
  font-size: 0.65rem;
  color: #94a3b8;
}

.project-cell--action {
  align-items: center;
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  color: #475569;
  background: #f1f5f9;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  display: inline-block;
  letter-spacing: 0.02em;
}

.project-table__row > .project-cell > span:not(.mono) {
  font-size: 0.85rem;
  color: #1e293b;
}

/* ===== 操作按钮 ===== */
.project-table__row .ghost-button {
  padding: 0.25rem 0.8rem;
  font-size: 0.7rem;
  border-radius: 24px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  box-shadow: none;
  min-width: auto;
}

.project-table__row .ghost-button:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: none;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .project-table__head,
  .project-table__row {
    grid-template-columns: 0.9fr 1.2fr 0.9fr 1fr 0.8fr 0.8fr 0.8fr 1.2fr 0.7fr;
    gap: 0.3rem 0.5rem;
  }
}

@media (max-width: 992px) {
  .page-stack {
    padding: 1.25rem 1rem;
  }

  .page-title-row {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }

  .panel {
    padding: 1rem 1.25rem;
  }

  .project-table__head,
  .project-table__row {
    grid-template-columns: 0.8fr 1.1fr 0.8fr 0.9fr 0.7fr 0.7fr 0.7fr 1.1fr 0.6fr;
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .page-title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0;
  }

  .title-left {
    gap: 0.1rem;
  }

  .page-title-row .ghost-button {
    align-self: flex-start;
  }

  .project-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .project-table__head,
  .project-table__row {
    min-width: 780px;
    grid-template-columns: 0.8fr 1.1fr 0.8fr 0.9fr 0.7fr 0.7fr 0.7fr 1.1fr 0.6fr;
    padding: 0.5rem 0.6rem;
  }

  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .project-cell--date {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }
}

@media (max-width: 480px) {
  .page-stack {
    padding: 1rem 0.75rem;
  }

  .page-title-row h2 {
    font-size: 1.1rem;
  }

  .section-eyebrow {
    font-size: 0.55rem;
  }

  .page-user {
    font-size: 0.7rem;
  }

  .ghost-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
  }

  .panel {
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
  }

  .project-table__head,
  .project-table__row {
    min-width: 680px;
    font-size: 0.7rem;
    gap: 0.25rem 0.35rem;
    padding: 0.4rem 0.4rem;
  }

  .project-cell--name strong {
    font-size: 0.75rem;
  }

  .project-cell--date time {
    font-size: 0.65rem;
  }

  .project-table__row .ghost-button {
    padding: 0.2rem 0.5rem;
    font-size: 0.6rem;
  }

  .button-icon {
    width: 14px;
    height: 14px;
  }

  .panel-toolbar {
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
  }

  .panel-toolbar strong {
    font-size: 0.85rem;
  }

  .panel-toolbar span {
    font-size: 0.7rem;
  }

  .state-panel {
    padding: 1.5rem 1rem;
    min-height: 150px;
  }

  .state-panel h3 {
    font-size: 0.95rem;
  }

  .state-panel p {
    font-size: 0.8rem;
  }
}
</style>