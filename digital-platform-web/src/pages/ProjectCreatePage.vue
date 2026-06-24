<template>
  <section class="page-stack animate-fadeIn">
    <!-- STREAMING_CHUNK: 渲染页面顶部说明与退回主台账操作... -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目主数据</span>
        <h2>新建项目</h2>
        <div class="user-meta">
          <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
        </div>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>返回列表</span>
      </button>
    </div>

    <!-- STREAMING_CHUNK: 构建卡片化的高保真表单网格，移除内嵌警示栏... -->
    <form class="panel form-grid" @submit.prevent="submitProject">
      
      <!-- 项目编号 -->
      <label class="form-group">
        <span class="label-text">项目编号 <span class="required-star">*</span></span>
        <div class="input-wrapper">
          <input v-model.trim="form.projectCode" type="text" autocomplete="off" placeholder="例如: PROJ-2026-001" />
        </div>
      </label>

      <!-- 项目名称 -->
      <label class="form-group">
        <span class="label-text">项目名称 <span class="required-star">*</span></span>
        <div class="input-wrapper">
          <input v-model.trim="form.projectName" type="text" autocomplete="off" placeholder="请输入项目全称" />
        </div>
      </label>

      <!-- 客户 -->
      <label class="form-group">
        <span class="label-text">客户 <span class="required-star">*</span></span>
        <div class="input-wrapper">
          <input v-model.trim="form.customerName" type="text" autocomplete="off" placeholder="请输入客户或单位名称" />
        </div>
      </label>

      <!-- 项目模式 -->
      <label class="form-group">
        <span class="label-text">项目模式</span>
        <div class="select-wrapper">
          <select v-model="form.projectMode">
            <option value="self_developed">自研模式</option>
            <option value="outsourced">供应链/外包模式</option>
          </select>
        </div>
      </label>

      <!-- 项目经理 -->
      <label class="form-group">
        <span class="label-text">项目经理 <span class="required-star">*</span></span>
        <div class="select-wrapper">
          <select v-model="form.projectManagerUserId" :disabled="managerCandidatesLoading">
            <option value="">{{ managerCandidatesLoading ? '正在加载候选用户...' : '请选择项目经理' }}</option>
            <option v-for="user in managerCandidates" :key="user.id" :value="String(user.id)">
              {{ formatManagerCandidate(user) }}
            </option>
          </select>
        </div>
      </label>

      <!-- 计划开始时间 -->
      <label class="form-group">
        <span class="label-text">计划开始时间</span>
        <div class="input-wrapper">
          <input v-model="form.plannedStartDate" type="date" />
        </div>
      </label>

      <!-- 计划完成时间 -->
      <label class="form-group">
        <span class="label-text">计划完成时间</span>
        <div class="input-wrapper">
          <input v-model="form.plannedEndDate" type="date" />
        </div>
      </label>

      <!-- 参与部门 (跨网格全宽) -->
      <div class="form-group form-grid__wide">
        <span class="label-text">参与部门</span>
        <div class="department-checkbox-group">
          <label
            v-for="department in departmentOptions"
            :key="department.value"
            :class="['department-checkbox', { 'department-checkbox--active': form.participatingDepartments.includes(department.value) }]"
          >
            <input v-model="form.participatingDepartments" type="checkbox" :value="department.value" class="hidden-checkbox" />
            <span class="checkbox-indicator"></span>
            <span class="checkbox-label">{{ department.label }}</span>
          </label>
        </div>
      </div>

      <!-- 备注 -->
      <label class="form-group form-grid__wide">
        <span class="label-text">备注</span>
        <div class="textarea-wrapper">
          <textarea v-model.trim="form.remark" rows="4" placeholder="请在此处填写项目其他补充备注说明..."></textarea>
        </div>
      </label>

      <!-- 底部操作按钮 -->
      <div class="form-actions form-grid__wide">
        <button type="button" class="ghost-button" @click="navigate('/projects')">取消</button>
        <button type="submit" class="primary-button" :disabled="submitting">
          <span v-if="submitting" class="spinner"></span>
          <span>{{ submitting ? '正在创建...' : '创建项目' }}</span>
        </button>
      </div>
    </form>

    <!-- STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层... -->
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
import { onMounted, reactive, ref, onUnmounted } from 'vue';
import { createProject, toReadableApiError } from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import {
  formatBusinessDepartment,
  formatOrganizationRole,
  formatUser
} from '../utils/format.js';

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

const emit = defineEmits(['auth-expired']);

const form = reactive({
  projectCode: '',
  projectName: '',
  customerName: '',
  projectMode: 'self_developed',
  projectManagerUserId: '',
  participatingDepartments: [],
  plannedStartDate: '',
  plannedEndDate: '',
  remark: ''
});

const submitting = ref(false);
const managerCandidates = ref([]);
const managerCandidatesLoading = ref(false);
const departmentOptions = [
  { value: 'operations_center', label: '运营中心' },
  { value: 'marketing_center', label: '营销中心' },
  { value: 'manufacturing_center', label: '制造中心' },
  { value: 'rd_center', label: '研发中心' }
];

// STREAMING_CHUNK: 统一定义 Toast 控制状态...
const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

function showToast(msg, type = 'error') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = false;
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

function formatManagerCandidate(user) {
  return [
    user.name,
    formatBusinessDepartment(user.department),
    formatOrganizationRole(user.organizationRole),
    user.role
  ]
    .filter(Boolean)
    .join(' / ');
}

// STREAMING_CHUNK: 改造表单校核拦截提示为 Toast 输出...
function validateForm() {
  const missing = [];
  if (!form.projectCode) missing.push('项目编号');
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.projectManagerUserId) missing.push('项目经理');

  if (missing.length > 0) {
    showToast(`请补充必填项：${missing.join('、')}`, 'error');
    return false;
  }

  return true;
}

async function loadManagerCandidates() {
  managerCandidatesLoading.value = true;

  try {
    managerCandidates.value = await listResponsibilityCandidates(props.authToken);
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    showToast(errorMsg, 'error');
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', errorMsg);
    }
  } finally {
    managerCandidatesLoading.value = false;
  }
}

// STREAMING_CHUNK: 改造项目创建请求结果提示为 Toast 输出...
async function submitProject() {
  if (!props.authToken) {
    const errorMsg = '请先登录后再创建项目。';
    showToast(errorMsg, 'error');
    emit('auth-expired', errorMsg);
    return;
  }

  if (!validateForm()) {
    return;
  }

  submitting.value = true;

  try {
    const created = await createProject({
      ...form,
      participatingDepartments: [...form.participatingDepartments]
    }, props.authToken);
    showToast('项目创建成功。', 'success');
    props.navigate(`/projects/${created.project.id}`);
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    showToast(errorMsg, 'error');
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', errorMsg);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadManagerCandidates);
</script>

<style scoped>
/* 全局页面容器 */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
  position: relative;
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

/* 顶部标题行 */
.page-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.5rem;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: #e2e8f0;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
}

.page-title-row h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
  color: #475569;
}

.meta-icon {
  width: 16px;
  height: 16px;
  stroke: #64748b;
}

.page-user {
  font-size: 0.875rem;
  font-weight: 500;
}

/* 按钮样式 */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.ghost-button:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-size: 0.925rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  height: 44px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
  transform: translateY(-1px);
}

.primary-button:active:not(:disabled) {
  transform: scale(0.98);
}

.primary-button:disabled {
  opacity: 0.6;
  background: #475569;
  cursor: not-allowed;
  box-shadow: none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.25);
  border-top: 2.5px solid white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* 表单面板 */
.panel {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 20, 40, 0.03);
  padding: 2.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem 2rem;
}

.form-grid__wide {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

.required-star {
  color: #ef4444;
}

/* 输入组件容器包装 */
.input-wrapper,
.select-wrapper,
.textarea-wrapper {
  position: relative;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  transition: all 0.2s ease;
  overflow: hidden;
}

.input-wrapper:focus-within,
.select-wrapper:focus-within,
.textarea-wrapper:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-wrapper input,
.select-wrapper select,
.textarea-wrapper textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

/* 下拉菜单特有样式 */
.select-wrapper select {
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #64748b;
  pointer-events: none;
}

/* 文本域单独处理 */
.textarea-wrapper textarea {
  resize: vertical;
}

/* 参与部门复选控制 */
.department-checkbox-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 0.25rem;
}

.department-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.hidden-checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkbox-indicator {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  transition: all 0.15s;
  flex-shrink: 0;
}

.department-checkbox:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.department-checkbox--active {
  border-color: #2563eb;
  background: #eff6ff;
}

.department-checkbox--active .checkbox-indicator {
  border-color: #2563eb;
  background: #2563eb;
}

.department-checkbox--active .checkbox-indicator::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #334155;
  transition: color 0.15s;
}

.department-checkbox--active .checkbox-label {
  color: #1e40af;
  font-weight: 600;
}

/* STREAMING_CHUNK: 统一样式的 Toast 消息弹出浮层 CSS... */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 9999;
  border: 1px solid #f1f5f9;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  stroke: #dc2626;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #22c55e;
}

.toast--success .toast-icon {
  stroke: #16a34a;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

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
  color: #94a3b8;
}

.toast-close:hover {
  background: #f1f5f9;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

/* 操作区域 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
  margin-top: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid__wide {
    grid-column: span 1;
  }
  .department-checkbox-group {
    grid-template-columns: repeat(2, 1fr);
  }
  .panel {
    padding: 1.5rem;
  }
}
</style>