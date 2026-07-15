import { reactive, ref, toValue } from 'vue';
import {
  downloadSolutionDesignReviewGeneratedFile,
  getSolutionDesignReviewForm,
  saveSolutionDesignReviewForm,
  submitSolutionDesignReviewForm,
  toReadableApiError
} from '../../../api/projects.js';
import { saveSolutionDesignBlob } from './useSolutionDesignWorkflow.js';

const repeatableKeys = Object.freeze(['projectTargetDescription', 'technicalRisks', 'solutionSuggestions', 'actionItems']);

function syncObject(target, source = {}) {
  for (const key of Object.keys(target)) delete target[key];
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = Array.isArray(value) ? [...value] : value ?? '';
  }
}

function normalizeRepeatable(value, keepEmptyRow = true) {
  const rows = Array.isArray(value) ? value : value == null || value === '' ? [] : String(value).split(/\r?\n/);
  const normalized = rows
    .map((item) => String(item ?? ''))
    .filter((item) => item.trim() || keepEmptyRow);
  return normalized.length || !keepEmptyRow ? normalized : [''];
}

function normalizeForUi(source = {}, defaultRecorderName = '') {
  const normalized = { ...source };
  for (const key of repeatableKeys) normalized[key] = normalizeRepeatable(source[key]);
  if (!String(normalized.recorder || '').trim() && defaultRecorderName) normalized.recorder = defaultRecorderName;
  return normalized;
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
    for (const key of repeatableKeys) payload[key] = normalizeRepeatable(reviewFormData[key], false);
    payload.recorder = String(payload.recorder || recorder()).trim();
    return payload;
  }
  function updateReviewFormField({ key, value }) { reviewFormData[key] = value; }
  function invalidateRequests() { reloadSequence += 1; }

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
    const dto = await runAction(`review:${nodeKey}:submit`, () => submitSolutionDesignReviewForm(id(), nodeKey, buildPayload(), token()), '方案评审记录表已提交并触发模板生成。');
    if (dto) { reviewFormDtos[nodeKey] = dto; syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder())); }
  }
  async function downloadReviewGeneratedFile(nodeKey) {
    await runAction(`review:${nodeKey}:download`, async () => {
      const download = await downloadSolutionDesignReviewGeneratedFile(id(), nodeKey, token());
      saveSolutionDesignBlob(download, reviewFormDtos[nodeKey]?.form?.generatedFile?.fileName || '方案评审记录表.xlsx');
    }, '方案评审记录表生成文件已开始下载。', { notify: false });
  }

  return { reviewFormDtos, reviewFormData, reviewFormLoading, isReviewNode, activeReviewFormDto, syncFromWorkflow, loadReviewForm, invalidateRequests, updateReviewFormField, saveReviewForm, submitReviewForm, downloadReviewGeneratedFile };
}
