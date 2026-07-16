import { computed, reactive, ref, toValue } from 'vue';
import { ElMessage } from 'element-plus';
import {
  downloadSolutionDesignReviewGeneratedFile,
  getSolutionDesignReviewForm,
  saveSolutionDesignReviewForm,
  submitSolutionDesignReviewForm,
  toReadableApiError
} from '../../../api/projects.js';
import { saveSolutionDesignBlob } from './useSolutionDesignWorkflow.js';
import {
  buildImplementationPlanItems,
  implementationPlanSources,
  normalizeRepeatable,
  reviewRepeatableKeys
} from './implementationPlanItems.js';

function syncObject(target, source = {}) {
  for (const key of Object.keys(target)) delete target[key];
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = Array.isArray(value) ? [...value] : value ?? '';
  }
}

function normalizeForUi(source = {}, defaultRecorderName = '') {
  const normalized = { ...source };
  for (const key of reviewRepeatableKeys) normalized[key] = normalizeRepeatable(source[key]);
  normalized.implementationPlanItems = buildImplementationPlanItems(normalized);
  if (!String(normalized.recorder || '').trim() && defaultRecorderName) normalized.recorder = defaultRecorderName;
  return normalized;
}

function showSubmitResult(dto) {
  const generatedFile = dto?.form?.generatedFile;
  if (generatedFile?.status === 'failed') {
    ElMessage.error(generatedFile.errorMessage || '方案评审记录表生成失败。');
    return;
  }

  const autoSubmit = dto?.autoSubmit;
  if (autoSubmit?.submitted) {
    ElMessage.success('方案评审记录表已提交并生成文件，节点已自动进入待审批。');
    return;
  }

  if (autoSubmit?.attempted) {
    ElMessage.warning(autoSubmit.message || '方案评审记录表已提交并生成文件，节点暂未提交。');
    return;
  }

  ElMessage.success('方案评审记录表已提交并生成文件。');
}

export function useSolutionReviewForm({ projectId, authToken, selectedNodeKey, defaultRecorderName, runAction, localError }) {
  const reviewFormDtos = reactive({});
  const reviewFormData = reactive({});
  const reviewFormLoading = ref(false);
  let reloadSequence = 0;
  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';
  const activeKey = () => toValue(selectedNodeKey) || '';
  const recorder = () => toValue(defaultRecorderName) || '';

  function isReviewNode(nodeKey) { return ['internal_solution_review', 'customer_solution_review'].includes(nodeKey); }
  function buildPermissions(node) { return { canViewReviewForm: true, canEditReviewForm: node?.permissions?.canEditReviewForm === true, canSubmitReviewForm: node?.permissions?.canSubmitReviewForm === true, canSubmitNode: node?.permissions?.canSubmit === true, canApprove: node?.permissions?.canApprove === true, canReturn: node?.permissions?.canReturn === true }; }
  function buildDtoFromWorkflow(workflow, nodeKey) {
    const node = workflow?.nodes?.find((item) => item.nodeKey === nodeKey);
    const form = workflow?.reviewForms?.[nodeKey] || null;
    if (!node && !form) return null;
    return {
      projectId: workflow?.projectId,
      stageKey: workflow?.currentStage?.stageKey,
      nodeKey,
      nodeStatus: node?.status,
      nodeRevision: node?.currentRevision || 1,
      reviewType: nodeKey === 'internal_solution_review' ? 'internal' : 'customer',
      form,
      permissions: buildPermissions(node)
    };
  }
  function syncFromWorkflow(workflow, currentNodeKey) {
    for (const nodeKey of ['internal_solution_review', 'customer_solution_review']) {
      const dto = buildDtoFromWorkflow(workflow, nodeKey);
      if (dto) reviewFormDtos[nodeKey] = dto; else delete reviewFormDtos[nodeKey];
    }
    if (isReviewNode(currentNodeKey)) syncObject(reviewFormData, normalizeForUi(reviewFormDtos[currentNodeKey]?.form?.formData, recorder()));
  }
  function activeReviewFormDto(workflow, node) {
    const nodeKey = node?.nodeKey;
    if (!nodeKey) return null;
    return reviewFormDtos[nodeKey] || { projectId: workflow?.projectId, nodeKey, form: workflow?.reviewForms?.[nodeKey] || null, permissions: buildPermissions(node) };
  }
  function buildPayload() {
    const payload = { ...reviewFormData };
    for (const key of reviewRepeatableKeys) payload[key] = normalizeRepeatable(reviewFormData[key], false);
    payload.implementationPlanItems = buildImplementationPlanItems(reviewFormData);
    payload.recorder = String(payload.recorder || recorder()).trim();
    return payload;
  }
  function updateReviewFormField({ key, value }) {
    reviewFormData[key] = value;
    if (implementationPlanSources.some((source) => source.fieldKey === key)) {
      reviewFormData.implementationPlanItems = buildImplementationPlanItems(reviewFormData);
    }
  }
  function syncImplementationPlanItems() {
    reviewFormData.implementationPlanItems = buildImplementationPlanItems(reviewFormData);
  }
  function repeatableItemsFor(key) {
    return reviewRepeatableKeys.includes(key) ? normalizeRepeatable(reviewFormData[key]) : [''];
  }
  function updateRepeatableItem({ key, index, value }) {
    if (!reviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows[index] = String(value ?? '');
    reviewFormData[key] = rows;
    syncImplementationPlanItems();
  }
  function addRepeatableItem(key) {
    if (!reviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows.push('');
    reviewFormData[key] = rows;
    syncImplementationPlanItems();
  }
  function removeRepeatableItem({ key, index }) {
    if (!reviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows.splice(index, 1);
    reviewFormData[key] = rows.length ? rows : [''];
    syncImplementationPlanItems();
  }
  function updateImplementationPlanItem({ sourceType, sourceIndex, planText }) {
    const items = buildImplementationPlanItems(reviewFormData);
    const target = items.find((item) => item.sourceType === sourceType && item.sourceIndex === sourceIndex);
    if (target) target.planText = String(planText || '');
    reviewFormData.implementationPlanItems = items;
  }
  function invalidateRequests() { reloadSequence += 1; }
  const implementationPlanItems = computed(() => buildImplementationPlanItems(reviewFormData));

  async function loadReviewForm(nodeKey, { sequence = ++reloadSequence } = {}) {
    if (!nodeKey || !id()) return;
    reviewFormLoading.value = true; localError.value = '';
    try {
      const dto = await getSolutionDesignReviewForm(id(), nodeKey, token());
      if (sequence !== reloadSequence || activeKey() !== nodeKey) return;
      reviewFormDtos[nodeKey] = dto;
      syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder()));
    } catch (error) {
      if (sequence === reloadSequence && activeKey() === nodeKey) localError.value = toReadableApiError(error);
    } finally {
      if (sequence === reloadSequence && activeKey() === nodeKey) reviewFormLoading.value = false;
    }
  }
  async function saveReviewForm(nodeKey) {
    const dto = await runAction(`review:${nodeKey}:save`, () => saveSolutionDesignReviewForm(id(), nodeKey, buildPayload(), token()), '方案评审记录表草稿已保存。');
    if (dto) { reviewFormDtos[nodeKey] = dto; syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder())); }
  }
  async function submitReviewForm(nodeKey) {
    const dto = await runAction(
      `review:${nodeKey}:submit`,
      () => submitSolutionDesignReviewForm(id(), nodeKey, buildPayload(), token()),
      null
    );
    if (dto) {
      reviewFormDtos[nodeKey] = dto;
      syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder()));
      showSubmitResult(dto);
    }
    return dto;
  }
  async function downloadReviewGeneratedFile(nodeKey) {
    await runAction(`review:${nodeKey}:download`, async () => {
      const download = await downloadSolutionDesignReviewGeneratedFile(id(), nodeKey, token());
      saveSolutionDesignBlob(download, reviewFormDtos[nodeKey]?.form?.generatedFile?.fileName || '方案评审记录表.xlsx');
    }, '方案评审记录表生成文件已开始下载。', { notify: false });
  }

  return {
    reviewFormDtos,
    reviewFormData,
    reviewFormLoading,
    implementationPlanItems,
    isReviewNode,
    activeReviewFormDto,
    syncFromWorkflow,
    loadReviewForm,
    invalidateRequests,
    updateReviewFormField,
    repeatableItemsFor,
    updateRepeatableItem,
    addRepeatableItem,
    removeRepeatableItem,
    updateImplementationPlanItem,
    saveReviewForm,
    submitReviewForm,
    downloadReviewGeneratedFile
  };
}
