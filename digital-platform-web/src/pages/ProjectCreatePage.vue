<template>
  <section class="page-stack">
    <!-- 精简标题行 -->
    <div class="page-title-row">
      <div class="title-left">
        <span class="section-eyebrow">项目主数据</span>
        <h2>新建项目</h2>
        <span class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      </div>
      <button type="button" class="ghost-button" @click="navigate('/projects')">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        返回列表
      </button>
    </div>

    <form class="panel form-grid" @submit.prevent="submitProject">
      <!-- 基本信息 -->
      <label>
        <span>项目编号 <span class="required">*</span></span>
        <input v-model.trim="form.projectCode" type="text" placeholder="例如：PRJ-2024-001" autocomplete="off" />
      </label>
      <label>
        <span>项目名称 <span class="required">*</span></span>
        <input v-model.trim="form.projectName" type="text" placeholder="请输入项目名称" autocomplete="off" />
      </label>
      <label>
        <span>客户 <span class="required">*</span></span>
        <input v-model.trim="form.customerName" type="text" placeholder="请输入客户名称" autocomplete="off" />
      </label>
      <label>
        <span>项目经理 <span class="required">*</span></span>
        <input v-model.trim="form.projectManager" type="text" placeholder="请输入项目经理姓名" autocomplete="off" />
      </label>
      <label>
        <span>参与部门</span>
        <input v-model.trim="departmentsText" type="text" placeholder="研发中心、制造中心（用逗号分隔）" />
      </label>
      <label>
        <span>计划开始时间</span>
        <input v-model="form.plannedStartDate" type="date" />
      </label>
      <label>
        <span>计划完成时间</span>
        <input v-model="form.plannedEndDate" type="date" />
      </label>
      <label class="form-grid__wide">
        <span>备注</span>
        <textarea v-model.trim="form.remark" rows="4" placeholder="请输入项目备注信息..."></textarea>
      </label>

      <!-- 状态消息 -->
      <div v-if="clientError || serverError" class="state-panel state-panel--error form-grid__wide">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{{ clientError || serverError }}</p>
      </div>

      <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p>{{ successMessage }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions form-grid__wide">
        <button type="button" class="ghost-button" @click="navigate('/projects')">取消</button>
        <button type="submit" class="primary-button" :disabled="submitting">
          <svg v-if="!submitting" class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span v-else class="spinner"></span>
          {{ submitting ? '正在创建...' : '创建项目' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { createProject, toReadableApiError } from '../api/projects.js';
import { formatUser } from '../utils/format.js';

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
  projectManager: '',
  plannedStartDate: '',
  plannedEndDate: '',
  remark: ''
});

const departmentsText = ref('');
const submitting = ref(false);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');

function validateForm() {
  const missing = [];
  if (!form.projectCode) missing.push('项目编号');
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.projectManager) missing.push('项目经理');

  if (missing.length > 0) {
    clientError.value = `请补充：${missing.join('、')}`;
    return false;
  }

  clientError.value = '';
  return true;
}

function parseDepartments() {
  return departmentsText.value
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function submitProject() {
  serverError.value = '';
  successMessage.value = '';

  if (!props.authToken) {
    serverError.value = '请先登录后再创建项目。';
    emit('auth-expired', serverError.value);
    return;
  }

  if (!validateForm()) {
    return;
  }

  submitting.value = true;

  try {
    const created = await createProject({
      ...form,
      participatingDepartments: parseDepartments()
    }, props.authToken);
    successMessage.value = '项目创建成功。';
    props.navigate(`/projects/${created.project.id}`);
  } catch (error) {
    serverError.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', serverError.value);
    }
  } finally {
    submitting.value = false;
  }
}
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
  justify-content: center;
  gap: 0.5rem;
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
  font-family: inherit;
  min-width: 120px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ===== 加载动画 ===== */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

/* ===== 表单网格 ===== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
  letter-spacing: 0.02em;
}

.form-grid label span {
  display: block;
}

.required {
  color: #ef4444;
  font-weight: 600;
  margin-left: 0.1rem;
}

.form-grid input,
.form-grid textarea {
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.875rem;
  color: #0f172a;
  transition: border 0.2s ease, box-shadow 0.2s ease;
  font-weight: 400;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.form-grid input::placeholder,
.form-grid textarea::placeholder {
  color: #94a3b8;
}

.form-grid input:focus,
.form-grid textarea:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.form-grid textarea {
  resize: vertical;
  min-height: 80px;
}

/* ===== 状态面板 ===== */
.state-panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
}

.state-panel--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.state-panel--error p {
  color: #b91c1c;
  margin: 0;
  font-size: 0.85rem;
}

.state-panel--success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.state-panel--success p {
  color: #166534;
  margin: 0;
  font-size: 0.85rem;
}

.state-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.state-panel--error .state-icon {
  color: #dc2626;
  stroke: #dc2626;
}

.state-panel--success .state-icon {
  color: #16a34a;
  stroke: #16a34a;
}

/* ===== 表单操作按钮 ===== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .page-stack {
    padding: 1.25rem 1rem;
  }

  .page-title-row {
    padding: 0;
  }

  .panel {
    padding: 1rem 1.25rem;
  }

  .form-grid {
    gap: 0.75rem 1.25rem;
  }
}

@media (max-width: 768px) {
  .page-title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .page-title-row .ghost-button {
    align-self: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .form-grid__wide {
    grid-column: 1;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
    justify-content: center;
  }

  .panel {
    padding: 1rem 0.85rem;
  }

  .state-panel {
    padding: 0.6rem 0.85rem;
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
    padding: 0.75rem 0.65rem;
    border-radius: 0.75rem;
  }

  .form-grid {
    gap: 0.6rem;
  }

  .form-grid label {
    font-size: 0.7rem;
  }

  .form-grid input,
  .form-grid textarea {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }

  .primary-button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    min-width: 100px;
  }

  .button-icon {
    width: 14px;
    height: 14px;
  }

  .state-panel p {
    font-size: 0.75rem;
  }

  .state-icon {
    width: 16px;
    height: 16px;
  }
}
</style>