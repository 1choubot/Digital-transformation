<template>
  <section class="page-stack">
    <PageHeader
      eyebrow="项目主数据"
      title="新建项目"
      :current-user="currentUser"
      subtitle="新建项目完成后进入项目工作区，后续阶段、资料和节点产出在工作区处理。"
    >
      <template #actions>
        <button type="button" class="ghost-button" @click="navigate('/projects')">返回项目总览</button>
      </template>
    </PageHeader>

    <section v-if="!canCreateProject" class="state-panel state-panel--error">
      <h3>无权创建项目</h3>
      <p>当前账号无权创建项目。项目创建仅开放给总经理和中心负责人。</p>
      <button type="button" class="primary-button" @click="navigate('/projects')">返回项目总览</button>
    </section>

    <form v-else class="panel form-grid" @submit.prevent="submitProject">
      <label>
        <span>项目名称</span>
        <input v-model.trim="form.projectName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户</span>
        <input v-model.trim="form.customerName" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户联系人</span>
        <input v-model.trim="form.customerContactPerson" type="text" autocomplete="off" />
      </label>
      <label>
        <span>客户联系方式</span>
        <input v-model.trim="form.customerContact" type="text" autocomplete="off" />
      </label>
      <label>
        <span>商务负责人</span>
        <select v-model="form.businessResponsibleUserId" :disabled="responsibilityCandidatesLoading">
          <option value="">请选择营销中心人员</option>
          <option v-for="user in businessResponsibleCandidates" :key="user.id" :value="String(user.id)">
            {{ formatCandidate(user) }}
          </option>
        </select>
      </label>
      <label>
        <span>技术负责人</span>
        <select v-model="form.technicalResponsibleUserId" :disabled="responsibilityCandidatesLoading">
          <option value="">请选择研发中心人员</option>
          <option v-for="user in technicalResponsibleCandidates" :key="user.id" :value="String(user.id)">
            {{ formatCandidate(user) }}
          </option>
        </select>
      </label>

      <div v-if="responsibilityCandidatesErrorMessage" class="state-panel state-panel--error form-grid__wide">
        <p>{{ responsibilityCandidatesErrorMessage }}</p>
      </div>

      <div v-if="clientError || serverError" class="state-panel state-panel--error form-grid__wide">
        <p>{{ clientError || serverError }}</p>
      </div>

      <div v-if="successMessage" class="state-panel state-panel--success form-grid__wide">
        <p>{{ successMessage }}</p>
      </div>

      <div class="form-actions form-grid__wide">
        <button type="button" class="ghost-button" @click="navigate('/projects')">取消</button>
        <button type="submit" class="primary-button" :disabled="submitting || !canCreateProject">
          {{ submitting ? '正在创建...' : '创建项目' }}
        </button>
      </div>

      <!-- 2列紧凑表单 -->
      <div class="form-grid">
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
              <option value="">{{ managerCandidatesLoading ? '正在加载...' : '请选择项目经理' }}</option>
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

        <!-- 参与部门（跨网格全宽） -->
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

        <!-- 备注（跨网格全宽） -->
        <label class="form-group form-grid__wide">
          <span class="label-text">备注</span>
          <div class="textarea-wrapper">
            <textarea v-model.trim="form.remark" rows="2" placeholder="请在此处填写项目其他补充备注说明..."></textarea>
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
      </div>
    </form>

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
import { onMounted, reactive, ref, onUnmounted } from 'vue';
import { createProject, toReadableApiError } from '../api/projects.js';
import { listResponsibilityCandidates } from '../api/users.js';
import PageHeader from '../components/PageHeader.vue';
import { formatBusinessDepartment } from '../utils/format.js';

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
  projectName: '',
  customerName: '',
  customerContactPerson: '',
  customerContact: '',
  businessResponsibleUserId: '',
  technicalResponsibleUserId: ''
});

const submitting = ref(false);
const responsibilityCandidatesLoading = ref(false);
const responsibilityCandidatesErrorMessage = ref('');
const responsibilityCandidates = ref([]);
const clientError = ref('');
const serverError = ref('');
const successMessage = ref('');
const canCreateProject = computed(() =>
  ['general_manager', 'center_manager'].includes(props.currentUser?.organizationRole)
);
const enabledCandidates = computed(() =>
  responsibilityCandidates.value.filter((candidate) => candidate.isEnabled !== false)
);
const businessResponsibleCandidates = computed(() =>
  enabledCandidates.value.filter((candidate) => candidate.department === 'marketing_center')
);
const technicalResponsibleCandidates = computed(() =>
  enabledCandidates.value.filter((candidate) => candidate.department === 'rd_center')
);

function validateForm() {
  const missing = [];
  if (!form.projectCode) missing.push('项目编号');
  if (!form.projectName) missing.push('项目名称');
  if (!form.customerName) missing.push('客户');
  if (!form.customerContactPerson) missing.push('客户联系人');
  if (!form.customerContact) missing.push('客户联系方式');
  if (!form.businessResponsibleUserId) missing.push('商务负责人');
  if (!form.technicalResponsibleUserId) missing.push('技术负责人');

  if (missing.length > 0) {
    showToast(`请补充必填项：${missing.join('、')}`, 'error');
    return false;
  }

  return true;
}

function formatCandidate(user) {
  const department = user.department ? formatBusinessDepartment(user.department) : '';
  const name = user.name || user.account || `用户 ${user.id}`;
  return department ? `${name} / ${department}` : name;
}

async function loadResponsibilityCandidates() {
  if (!props.authToken || !canCreateProject.value) {
    return;
  }

  responsibilityCandidatesLoading.value = true;
  responsibilityCandidatesErrorMessage.value = '';

  try {
    responsibilityCandidates.value = await listResponsibilityCandidates(props.authToken);
  } catch (error) {
    responsibilityCandidatesErrorMessage.value = toReadableApiError(error);
    if (error.code === 'UNAUTHENTICATED') {
      emit('auth-expired', responsibilityCandidatesErrorMessage.value);
    }
  } finally {
    responsibilityCandidatesLoading.value = false;
  }
}

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
    const created = await createProject(
      {
        ...form,
        businessResponsibleUserId: Number(form.businessResponsibleUserId),
        technicalResponsibleUserId: Number(form.technicalResponsibleUserId)
      },
      props.authToken
    );
    successMessage.value = '项目创建成功。';
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

onMounted(loadResponsibilityCandidates);
</script>

<style scoped>
/* ===== 全局容器 ===== */
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  max-width: 1000px;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333333;
  position: relative;
  background: transparent;
  justify-content: center;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

/* ===== 面板 ===== */
.panel {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

/* ===== 表单面板 ===== */
.form-panel {
  padding: 1.25rem 1.5rem;
}

/* ===== 表单头部（标题 + 返回） ===== */
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ebeef5;
}

.form-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  position: relative;
  padding-left: 10px;
}

.form-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 3px;
  background: #3e63dd;
  border-radius: 2px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: none;
  color: #909399;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.back-link svg {
  width: 14px;
  height: 14px;
}

.back-link:hover {
  color: #3e63dd;
  background: #ecf5ff;
}

/* ===== 表单网格（紧凑） ===== */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 1.5rem;
}

.form-grid__wide {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label-text {
  font-size: 0.8rem;
  font-weight: 500;
  color: #606266;
}

.required-star {
  color: #f56c6c;
}

/* ===== 输入组件（高度压缩） ===== */
.input-wrapper,
.select-wrapper,
.textarea-wrapper {
  position: relative;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  transition: all 0.2s;
  overflow: hidden;
}

.input-wrapper:focus-within,
.select-wrapper:focus-within,
.textarea-wrapper:focus-within {
  border-color: #3e63dd;
}

.input-wrapper input,
.select-wrapper select,
.textarea-wrapper textarea {
  width: 100%;
  padding: 0.35rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: #303133;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  height: 30px;
}

.select-wrapper select {
  padding-right: 2rem;
  appearance: none;
  cursor: pointer;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #c0c4cc;
  pointer-events: none;
}

.textarea-wrapper textarea {
  height: auto;
  resize: vertical;
  padding: 0.35rem 0.75rem;
  min-height: 48px;
}

/* ===== 参与部门复选框（紧凑） ===== */
.department-checkbox-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.department-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  background: #fafafa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.department-checkbox:hover {
  border-color: #c6e2ff;
  background: #f4f8ff;
}

.department-checkbox--active {
  border-color: #3e63dd;
  background: #ecf5ff;
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
  width: 14px;
  height: 14px;
  border: 1px solid #c0c4cc;
  border-radius: 3px;
  background: #ffffff;
  transition: all 0.15s;
  flex-shrink: 0;
}

.department-checkbox--active .checkbox-indicator {
  border-color: #3e63dd;
  background: #3e63dd;
}

.department-checkbox--active .checkbox-indicator::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 4px;
  height: 7px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: #606266;
  transition: color 0.15s;
}

.department-checkbox--active .checkbox-label {
  color: #3e63dd;
}

/* ===== 底部操作按钮（紧凑） ===== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  border-top: 1px solid #ebeef5;
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}

/* ===== 按钮样式（紧凑） ===== */
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 30px;
}

.ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #3e63dd;
  color: #ffffff;
  border: none;
  font-weight: 500;
  padding: 0.35rem 1.25rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 30px;
}

.primary-button:hover:not(:disabled) {
  background: #5275e7;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  z-index: 10000;
  border: 1px solid #ebeef5;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #f56c6c;
}
.toast--error .toast-icon {
  stroke: #f56c6c;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.toast--success {
  border-left: 4px solid #67c23a;
}
.toast--success .toast-icon {
  stroke: #67c23a;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 0.4rem;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background 0.2s;
  color: #c0c4cc;
}
.toast-close:hover {
  background: #f4f4f5;
}
.toast-close svg {
  width: 13px;
  height: 13px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* ===== 动画 ===== */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-stack {
    padding: 1rem;
    min-height: calc(100vh - 2rem);
    justify-content: flex-start;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem 0;
  }
  .form-grid__wide {
    grid-column: span 1;
  }
  .form-panel {
    padding: 1rem;
  }
  .department-checkbox-group {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-header {
    flex-wrap: wrap;
    gap: 0.3rem;
  }
}

@media (max-width: 600px) {
  .page-stack {
    padding: 0.75rem;
  }
  .form-panel {
    padding: 0.75rem;
  }
  .department-checkbox-group {
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem;
  }
  .department-checkbox {
    padding: 0.25rem 0.5rem;
  }
  .checkbox-label {
    font-size: 0.75rem;
  }
  .form-actions {
    flex-direction: column;
  }
  .form-actions .ghost-button,
  .form-actions .primary-button {
    width: 100%;
    justify-content: center;
  }
}
</style>