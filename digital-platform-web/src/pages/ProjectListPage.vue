<template>
  <section class="page-stack animate-fadeIn">
    <!-- 筛选与操作面板 -->
    <section class="panel project-filter-panel">
      <div class="project-filters">
        <label class="filter-group flex-1">
          <span class="filter-label">搜索项目</span>
          <div class="input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model.trim="projectKeyword"
              type="search"
              autocomplete="off"
              placeholder="搜索项目编号或项目名称..."
              @input="handleSearchInput"
            />
          </div>
        </label>

        <div class="filter-actions">
          <button type="button" class="primary-button create-btn" @click="navigate('/projects/new')">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>新建项目</span>
          </button>
          <button type="button" class="ghost-button reload-btn" :disabled="loading" @click="loadProjects">
            <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
            </svg>
            <span>{{ loading ? '加载中...' : '重新加载' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 主展示面板 -->
    <section class="panel">
      <div class="panel-toolbar">
        <div class="toolbar-info">
          <div class="badge-row">
            <span class="toolbar-title">项目台账</span>
            <span class="api-endpoint-badge">{{ apiBaseUrl }}</span>
          </div>
          <span class="toolbar-subtitle">共 {{ filteredProjects.length }} 个项目</span>
        </div>
      </div>

      <!-- 数据加载中 -->
      <div v-if="loading" class="state-panel state-panel--inline">
        <div class="loading-wave">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <p>正在拉取全量项目清单，请稍候...</p>
      </div>

      <!-- 异常捕捉 -->
      <div v-else-if="errorMessage" class="state-panel state-panel--error">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div class="error-details">
          <h3>项目列表加载失败</h3>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="primary-button inline-btn" @click="loadProjects">重试加载</button>
      </div>

      <!-- 空白状态 -->
      <div v-else-if="filteredProjects.length === 0" class="state-panel state-panel--empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <h3 v-if="projectKeyword">未找到匹配项目</h3>
        <h3 v-else>暂无数字化项目</h3>
        <p v-if="projectKeyword">没有项目编号或名称包含"{{ projectKeyword }}"的项目，请尝试其他关键词。</p>
        <p v-else>系统目前尚未建立任何项目台账。请先创建一个新项目！</p>
        <button v-if="!projectKeyword" type="button" class="primary-button inline-btn" @click="navigate('/projects/new')">新建项目</button>
        <button v-else type="button" class="ghost-button inline-btn" @click="clearSearch">清除搜索</button>
      </div>

      <!-- 项目列表（点击整行进入详情） -->
      <div v-else class="table-container">
        <div class="project-table">
          <!-- 表头：5列 -->
          <div class="project-table__head">
            <span>项目信息</span>
            <span>模式 / 经理</span>
            <span>状态</span>
            <span>当前阶段</span>
            <span>计划周期</span>
          </div>

          <div class="project-table__body">
            <article
              v-for="project in paginatedProjects"
              :key="project.id"
              class="project-table__row"
              @click="navigate(`/projects/${project.id}`)"
            >
              <!-- 列1：项目信息（编号 + 名称 + 客户） -->
              <div class="cell-project-info">
                <span class="mono-badge">{{ project.projectCode }}</span>
                <strong class="project-name" :title="project.projectName">{{ project.projectName }}</strong>
                <span class="customer-text" :title="project.customerName">{{ project.customerName }}</span>
              </div>

              <!-- 列2：模式 / 经理 -->
              <div class="cell-mode-manager">
                <span class="mode-tag">{{ formatProjectMode(project.projectMode) }}</span>
                <span class="manager-text" :title="formatUser(project.projectManagerUser)">{{ formatUser(project.projectManagerUser) }}</span>
              </div>

              <!-- 列3：状态 -->
              <div class="cell-status">
                <StatusBadge :status="project.status" />
              </div>

              <!-- 列4：当前阶段 -->
              <span class="stage-text" :title="project.currentStage?.stageName || '-'">
                {{ project.currentStage?.stageName || '-' }}
              </span>

              <!-- 列5：计划周期 -->
              <span class="date-range">
                {{ formatDate(project.plannedStartDate) }} <span class="to-arrow">→</span> {{ formatDate(project.plannedEndDate) }}
              </span>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- 分页控制 -->
    <footer v-if="filteredProjects.length > 0" class="panel pagination-panel">
      <div class="pagination-info">
        <span>当前第</span>
        <span class="page-current-highlight">{{ currentPage }}</span>
        <span>/ {{ totalPages }} 页</span>
        <span class="divider">|</span>
        <span>共 {{ filteredProjects.length }} 个项目</span>
        <span v-if="projectKeyword" class="search-indicator">（搜索: {{ projectKeyword }}）</span>
      </div>

      <div class="pagination-controls">
        <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(1)">首页</button>
        <button type="button" class="page-control-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
        <div class="page-numbers-group">
          <button
            v-for="page in visiblePages"
            :key="page"
            type="button"
            :class="['page-number-btn', { 'page-number-btn--active': page === currentPage }]"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>
        <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">下一页</button>
        <button type="button" class="page-control-btn" :disabled="currentPage === totalPages" @click="changePage(totalPages)">尾页</button>
      </div>

      <div class="pagination-sizes">
        <span>每页显示</span>
        <div class="select-wrapper select-size">
          <select v-model="pageSize" @change="currentPage = 1">
            <option :value="5">5 项/页</option>
            <option :value="8">8 项/页</option>
            <option :value="12">12 项/页</option>
            <option :value="20">20 项/页</option>
          </select>
        </div>
      </div>
    </footer>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast" :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }">
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="toastType === 'error'">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </template>
          <template v-else>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </template>
        </svg>
        <span>{{ toastMessage }}</span>
        <button type="button" class="toast-close" @click="hideToast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getApiBaseUrlLabel, listProjects, toReadableApiError } from '../api/projects.js';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatProjectMode, formatUser } from '../utils/format.js';

const props = defineProps({
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  navigate: { type: Function, required: true }
});

const apiBaseUrl = getApiBaseUrlLabel();
const loading = ref(false);
const errorMessage = ref('');
const projects = ref([]);

// 搜索与分页
const projectKeyword = ref('');
const currentPage = ref(1);
const pageSize = ref(5);

// Toast
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => { toastVisible.value = false; }, 3000);
}
function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = false;
}
onUnmounted(() => { if (toastTimer) clearTimeout(toastTimer); });

// 过滤
const filteredProjects = computed(() => {
  const kw = projectKeyword.value.trim().toLowerCase();
  if (!kw) return projects.value;
  return projects.value.filter(p =>
    (p.projectCode || '').toLowerCase().includes(kw) ||
    (p.projectName || '').toLowerCase().includes(kw)
  );
});

// 分页
const totalPages = computed(() => Math.ceil(filteredProjects.value.length / pageSize.value) || 1);
const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredProjects.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const range = [];
  const maxButtons = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages.value, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
  for (let i = start; i <= end; i++) range.push(i);
  return range;
});

function changePage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
}
function handleSearchInput() { currentPage.value = 1; }
function clearSearch() { projectKeyword.value = ''; currentPage.value = 1; }

async function loadProjects() {
  loading.value = true;
  errorMessage.value = '';
  try {
    projects.value = await listProjects(props.authToken);
    currentPage.value = 1;
  } catch (error) {
    const msg = toReadableApiError(error);
    errorMessage.value = msg;
    showToast(msg, 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(loadProjects);
</script>

<style scoped>
/* ===== 全局容器 ===== */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 100%;
  margin: 0;
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333;
  background: transparent;
  box-sizing: border-box;
  overflow: hidden;
}
.animate-fadeIn { animation: fadeIn 0.4s ease-out; }

.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
}

/* ===== 筛选面板 ===== */
.project-filter-panel { padding: 1.25rem 1.5rem; }
.project-filters {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
.flex-1 { flex: 1; min-width: 200px; }
.filter-label { font-size: 0.85rem; font-weight: 500; color: #606266; }

.input-wrapper {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  padding-left: 0.75rem;
  height: 36px;
  transition: border-color 0.2s;
}
.input-wrapper:focus-within { border-color: #3e63dd; }
.search-icon { width: 16px; height: 16px; stroke: #c0c4cc; flex-shrink: 0; }
.input-wrapper input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #303133;
  outline: none;
  min-width: 0;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
  flex-shrink: 0;
}

/* ===== 按钮 ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}
.ghost-button:hover:not(:disabled) { border-color: #c6e2ff; background: #ecf5ff; color: #3e63dd; }
.ghost-button:disabled { opacity: 0.6; cursor: not-allowed; }

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}
.primary-button:hover:not(:disabled) { background: #5275e7; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-icon { width: 16px; height: 16px; }
.spinner { width: 16px; height: 16px; animation: spin 0.8s linear infinite; stroke: currentColor; }

/* ===== 工具栏 ===== */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.toolbar-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.badge-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.toolbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  position: relative;
  padding-left: 10px;
}
.toolbar-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 4px;
  background: #3e63dd;
  border-radius: 2px;
}
.api-endpoint-badge {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  background: #f4f6f9;
  color: #606266;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  white-space: nowrap;
}
.toolbar-subtitle { font-size: 0.8rem; color: #909399; }

/* ===== 状态面板 ===== */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}
.state-panel--inline { padding: 3rem 1.5rem; }
.state-panel h3 { font-size: 1.1rem; font-weight: 600; color: #303133; margin-bottom: 0.5rem; }
.state-panel p { font-size: 0.9rem; color: #909399; max-width: 480px; }
.loading-wave { display: flex; gap: 6px; margin-bottom: 1rem; }
.wave-bar {
  width: 4px;
  height: 20px;
  background: #3e63dd;
  border-radius: 4px;
  animation: wave 1s ease-in-out infinite;
}
.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }
@keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
.empty-icon { width: 48px; height: 48px; stroke: #c0c4cc; margin-bottom: 1rem; }
.state-panel--error { background: #fef0f0; border-radius: 8px; margin: 1.5rem; padding: 2rem; }
.error-icon { width: 32px; height: 32px; stroke: #f56c6c; margin-bottom: 0.75rem; }
.inline-btn { margin-top: 1.25rem; }

/* ===== 表格容器 ===== */
.table-container {
  overflow: hidden;
  width: 100%;
}
.project-table {
  width: 100%;
}

/* ===== 表头：5列 — 只缩短"项目信息"列宽，其他列宽和行高均保持不变 ===== */
.project-table__head {
  display: grid;
  grid-template-columns: 1.3fr 1.2fr 0.8fr 1.2fr 1.4fr;
  padding: 0.7rem 1.5rem;
  background: #f4f6f9;
  border-bottom: 1px solid #ebeef5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #606266;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  gap: 0.75rem;
}

/* ===== 行：可点击，5列 — 与表头列宽严格对应 ===== */
.project-table__row {
  display: grid;
  grid-template-columns: 1.3fr 1.2fr 0.8fr 1.2fr 1.4fr;
  padding: 0.85rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s ease;
  font-size: 13px;
  color: #606266;
  gap: 0.75rem;
  cursor: pointer;
  min-width: 0;
}
.project-table__row:hover { background: #f8fafc; }
.project-table__row:last-child { border-bottom: none; }

/* ===== 列1：项目信息（编号 + 名称 + 客户） — 只调整宽度，行高保持不变 ===== */
.cell-project-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  overflow: hidden;
}
.mono-badge {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
  flex-shrink: 0;
}
.project-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.customer-text {
  font-size: 0.8rem;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 列2：模式 / 经理 ===== */
.cell-mode-manager {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.mode-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 500;
  color: #909399;
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
  flex-shrink: 0;
}
.manager-text {
  font-size: 0.8rem;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 列3：状态 ===== */
.cell-status {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* ===== 列4：当前阶段 ===== */
.stage-text {
  font-size: 0.85rem;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 列5：计划周期 ===== */
.date-range {
  font-size: 0.8rem;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.to-arrow { color: #c0c4cc; margin: 0 0.2rem; }

/* ===== 分页 ===== */
.pagination-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
}
.pagination-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #606266;
  flex-wrap: wrap;
}
.page-current-highlight {
  font-weight: 600;
  color: #3e63dd;
  background: #f0f3ff;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.pagination-info .divider { color: #ebeef5; margin: 0 0.5rem; }
.search-indicator { font-style: italic; color: #3e63dd; font-size: 0.8rem; margin-left: 0.25rem; }
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.page-control-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-control-btn:hover:not(:disabled) { color: #3e63dd; border-color: #a4b3ff; }
.page-control-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #f4f4f5; }
.page-numbers-group { display: flex; align-items: center; gap: 0.25rem; }
.page-number-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.page-number-btn:hover { color: #3e63dd; border-color: #a4b3ff; }
.page-number-btn--active { background: #3e63dd !important; color: #ffffff !important; border-color: #3e63dd !important; }
.pagination-sizes { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #606266; }
.select-size { width: 100px; }
.select-size select { padding: 0.3rem 1.5rem 0.3rem 0.65rem; font-size: 0.8rem; }

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}
.toast--error { border-left: 4px solid #f56c6c; }
.toast--error .toast-icon { stroke: #f56c6c; flex-shrink: 0; width: 20px; height: 20px; }
.toast--success { border-left: 4px solid #67c23a; }
.toast--success .toast-icon { stroke: #67c23a; flex-shrink: 0; width: 20px; height: 20px; }
.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background 0.2s;
  color: #c0c4cc;
}
.toast-close:hover { background: #f4f4f5; }
.toast-close svg { width: 14px; height: 14px; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-enter-to { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ============================================================ */
/* ===== 响应式：与 App.vue 断点保持一致 ===== */
/* ============================================================ */

/* 1024px 以下：侧边栏折叠，表格收缩为3列（隐藏部分次要信息） */
@media (max-width: 1024px) {
  .page-stack { padding: 1.25rem; }

  .project-table__head {
    grid-template-columns: 2fr 1fr 1fr;
  }
  .project-table__head span:nth-child(2),
  .project-table__head span:nth-child(5) {
    display: none;
  }

  .project-table__row {
    grid-template-columns: 2fr 1fr 1fr;
  }
  .project-table__row .date-range,
  .project-table__row .cell-mode-manager {
    display: none;
  }
  .project-table__row .cell-status { justify-content: flex-start; }
  .project-table__row .stage-text { font-size: 0.8rem; }
}

/* 768px 以下：完全变为卡片式布局 */
@media (max-width: 768px) {
  .page-stack { padding: 1rem; gap: 1rem; }

  .project-filter-panel { padding: 1rem; }
  .project-filters { flex-direction: column; align-items: stretch; gap: 0.75rem; }
  .flex-1 { min-width: 0; }
  .filter-actions { margin-left: 0; width: 100%; justify-content: stretch; }
  .filter-actions .primary-button,
  .filter-actions .ghost-button { flex: 1; justify-content: center; }

  .panel-toolbar { padding: 0.85rem 1rem; flex-direction: column; align-items: stretch; }
  .badge-row { flex-wrap: wrap; }

  .project-table__head { display: none; }

  .project-table__row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom: 2px solid #ebeef5;
    cursor: pointer;
  }
  .project-table__row:last-child { border-bottom: none; }

  .project-table__row .cell-mode-manager,
  .project-table__row .date-range {
    display: flex;
  }

  .project-table__row .cell-project-info {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .project-table__row .cell-project-info .project-name {
    font-size: 0.95rem;
    white-space: normal;
  }
  .project-table__row .cell-project-info .customer-text {
    font-size: 0.8rem;
    color: #909399;
  }

  .project-table__row .cell-mode-manager {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .project-table__row .cell-mode-manager .mode-tag { font-size: 0.7rem; }
  .project-table__row .cell-mode-manager .manager-text { font-size: 0.85rem; }

  .project-table__row .cell-status { align-items: flex-start; }
  .project-table__row .stage-text { font-size: 0.85rem; white-space: normal; }
  .project-table__row .date-range { font-size: 0.8rem; white-space: normal; }

  .pagination-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
  }
  .pagination-controls { justify-content: center; flex-wrap: wrap; }
  .pagination-sizes { justify-content: center; }
  .pagination-info { justify-content: center; }
}

/* 480px 以下：超小屏微调 */
@media (max-width: 480px) {
  .page-stack { padding: 0.75rem; gap: 0.75rem; }
  .project-table__row { padding: 0.75rem; }
  .project-table__row .cell-project-info .project-name { font-size: 0.85rem; }
  .page-control-btn { padding: 0.25rem 0.5rem; font-size: 0.7rem; }
  .page-number-btn { width: 28px; height: 28px; font-size: 0.75rem; }
}
</style>