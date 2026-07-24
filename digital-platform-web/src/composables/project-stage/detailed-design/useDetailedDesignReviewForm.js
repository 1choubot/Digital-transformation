import { reactive, ref, toValue } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getDetailedDesignReviewForm,
  saveDetailedDesignReviewForm,
  submitDetailedDesignReviewForm,
  toReadableApiError
} from '../../../api/projects.js';

export const detailedDesignReviewRepeatableKeys = Object.freeze([
  'designGoalAchievement',
  'designRiskAssessment',
  'designOptimizationSuggestions'
]);

export const detailedDesignReviewMatrixSections = Object.freeze([
  { key: 'designGoalAchievement', label: '目标', contentLabel: '设计目标达成' },
  { key: 'designRiskAssessment', label: '风险', contentLabel: '设计风险评估' },
  { key: 'designOptimizationSuggestions', label: '建议', contentLabel: '设计优化建议' }
]);

export const detailedDesignReviewFields = Object.freeze([
  { key: 'meetingDate', label: '评审时间', required: true },
  { key: 'meetingLocation', label: '评审地点' },
  { key: 'presenter', label: '主讲人' },
  { key: 'internalParticipants', label: '我方参与人员' },
  { key: 'customerParticipants', label: '甲方参与人员' },
  { key: 'designGoalAchievement', label: '设计目标达成', required: true },
  { key: 'designRiskAssessment', label: '设计风险评估', required: true },
  { key: 'designOptimizationSuggestions', label: '设计优化建议', required: true },
  { key: 'reviewConclusion', label: '评审结论', required: true },
  { key: 'recorder', label: '记录人' }
]);

function syncObject(target, source = {}) {
  for (const key of Object.keys(target)) delete target[key];
  for (const [key, value] of Object.entries(source || {})) {
    if (Array.isArray(value)) {
      target[key] = [...value];
    } else if (value && typeof value === 'object') {
      target[key] = Object.fromEntries(
        Object.entries(value).map(([itemKey, itemValue]) => [
          itemKey,
          Array.isArray(itemValue) ? [...itemValue] : itemValue
        ])
      );
    } else {
      target[key] = value ?? '';
    }
  }
}

function normalizeRepeatable(value, keepEmpty = true) {
  const rows = Array.isArray(value)
    ? value.map((item) => String(item || '').trim())
    : String(value ?? '')
        .split(/\r?\n/)
        .map((item) => item.trim());
  const normalized = rows.filter(Boolean);
  return normalized.length || !keepEmpty ? normalized : [''];
}

function normalizeForUi(source = {}, defaultRecorderName = '') {
  const normalized = { ...source };
  for (const key of detailedDesignReviewRepeatableKeys) {
    normalized[key] = normalizeRepeatable(source[key]);
  }
  normalized.implementationPlanItems = normalizeImplementationPlanItems(source, normalized);
  if (!String(normalized.recorder || '').trim() && defaultRecorderName) {
    normalized.recorder = defaultRecorderName;
  }
  return normalized;
}

function normalizeImplementationPlanItems(source = {}, normalized = source) {
  const rawItems = source?.implementationPlanItems;
  const legacyPlans = normalizeRepeatable(source?.designImplementationPlan, false);
  let legacyOffset = 0;
  const result = {};

  for (const section of detailedDesignReviewMatrixSections) {
    const rows = normalizeRepeatable(normalized?.[section.key]);
    const rawPlans = Array.isArray(rawItems?.[section.key]) ? rawItems[section.key] : [];
    result[section.key] = rows.map((_, index) => {
      const value = rawPlans[index];
      if (value !== undefined && value !== null) {
        return String(value || '').trim();
      }
      return String(legacyPlans[legacyOffset++] || '').trim();
    });
  }

  return result;
}

function buildImplementationPlanSummary(payload) {
  const rows = [];
  for (const section of detailedDesignReviewMatrixSections) {
    const contents = payload[section.key] || [];
    const plans = payload.implementationPlanItems?.[section.key] || [];
    contents.forEach((content, index) => {
      const contentText = String(content || '').trim();
      const planText = String(plans[index] || '').trim();
      if (!contentText && !planText) return;
      rows.push(`${section.label}${index + 1}：${contentText}\n实施计划：${planText}`);
    });
  }
  return rows;
}

export function getDetailedDesignReviewMissingRequiredFields(model = {}) {
  const missing = detailedDesignReviewFields
    .filter((field) => field.required === true)
    .filter((field) => {
      const value = model[field.key];
      return Array.isArray(value)
        ? value.every((item) => !String(item || '').trim())
        : !String(value || '').trim();
    })
    .map((field) => ({ key: field.key, label: field.label }));

  for (const section of detailedDesignReviewMatrixSections) {
    const contents = normalizeRepeatable(model[section.key], false);
    const plans = model.implementationPlanItems?.[section.key] || [];
    contents.forEach((content, index) => {
      if (String(content || '').trim() && !String(plans[index] || '').trim()) {
        missing.push({
          key: `implementationPlanItems.${section.key}.${index}`,
          label: `${section.label}${index + 1}实施计划`
        });
      }
    });
  }

  return missing;
}

function showSubmitResult(dto) {
  const generatedFile = dto?.form?.generatedFile;
  if (generatedFile?.status === 'failed') {
    ElMessage.error(generatedFile.errorMessage || '设计评审记录表生成失败。');
    return;
  }

  if (dto?.autoSubmit?.submitted) {
    ElMessage.success('设计评审记录表已提交并生成文件，节点已进入待审批。');
    return;
  }

  ElMessage.success('设计评审记录表已提交。');
}

export function useDetailedDesignReviewForm({
  projectId,
  authToken,
  selectedNodeKey,
  defaultRecorderName,
  runAction,
  localError
}) {
  const reviewFormDtos = reactive({});
  const reviewFormData = reactive({});
  const reviewFormLoading = ref(false);
  let reloadSequence = 0;
  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';
  const activeKey = () => toValue(selectedNodeKey) || '';
  const recorder = () => toValue(defaultRecorderName) || '';

  function isReviewNode(nodeKey) {
    return ['internal_design_review', 'customer_design_review'].includes(nodeKey);
  }

  function buildPermissions(node, form) {
    return {
      canViewReviewForm: form?.permissions?.canViewReviewForm === true || node?.permissions?.canViewReviewForm === true,
      canEditReviewForm: form?.permissions?.canEditReviewForm === true || node?.permissions?.canEditReviewForm === true,
      canSubmitReviewForm: form?.permissions?.canSubmitReviewForm === true || node?.permissions?.canSubmitReviewForm === true,
      canApprove: form?.permissions?.canApprove === true || node?.permissions?.canApprove === true,
      canReturn: form?.permissions?.canReturn === true || node?.permissions?.canReturn === true
    };
  }

  function findWorkflowReviewForm(workflow, nodeKey) {
    return (workflow?.reviewForms || []).find((item) => item.nodeKey === nodeKey) || null;
  }

  function buildDtoFromWorkflow(workflow, nodeKey) {
    const node = workflow?.nodes?.find((item) => item.nodeKey === nodeKey) || null;
    const form = findWorkflowReviewForm(workflow, nodeKey);
    if (!node && !form) return null;
    return {
      projectId: workflow?.projectId,
      stageKey: workflow?.stageKey,
      nodeKey,
      nodeStatus: node?.status,
      nodeRevision: node?.currentRevision || form?.revision || 1,
      reviewType: nodeKey === 'internal_design_review' ? 'internal' : 'customer',
      form,
      permissions: buildPermissions(node, form)
    };
  }

  function syncFromWorkflow(workflow, currentNodeKey) {
    for (const nodeKey of ['internal_design_review', 'customer_design_review']) {
      const dto = buildDtoFromWorkflow(workflow, nodeKey);
      if (dto) reviewFormDtos[nodeKey] = dto;
      else delete reviewFormDtos[nodeKey];
    }
    if (isReviewNode(currentNodeKey)) {
      syncObject(reviewFormData, normalizeForUi(reviewFormDtos[currentNodeKey]?.form?.formData, recorder()));
    }
  }

  function activeReviewFormDto(workflow, node) {
    const nodeKey = node?.nodeKey;
    if (!nodeKey) return null;
    return reviewFormDtos[nodeKey] || buildDtoFromWorkflow(workflow, nodeKey);
  }

  function buildPayload() {
    const payload = { ...reviewFormData };
    for (const key of detailedDesignReviewRepeatableKeys) {
      payload[key] = normalizeRepeatable(reviewFormData[key], false);
    }
    payload.implementationPlanItems = normalizeImplementationPlanItems(reviewFormData, payload);
    payload.implementationPlanSummary = buildImplementationPlanSummary(payload);
    payload.designImplementationPlan = payload.implementationPlanSummary;
    payload.recorder = String(payload.recorder || recorder()).trim();
    return payload;
  }

  function updateReviewFormField({ key, value }) {
    reviewFormData[key] = value;
  }

  function repeatableItemsFor(key) {
    return detailedDesignReviewRepeatableKeys.includes(key) ? normalizeRepeatable(reviewFormData[key]) : [''];
  }

  function updateRepeatableItem({ key, index, value }) {
    if (!detailedDesignReviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows[index] = String(value ?? '');
    reviewFormData[key] = rows;
    const planRows = reviewFormData.implementationPlanItems?.[key] || [];
    while (planRows.length < rows.length) planRows.push('');
    reviewFormData.implementationPlanItems = {
      ...(reviewFormData.implementationPlanItems || {}),
      [key]: planRows.slice(0, rows.length)
    };
  }

  function addRepeatableItem(key) {
    if (!detailedDesignReviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows.push('');
    reviewFormData[key] = rows;
    reviewFormData.implementationPlanItems = {
      ...(reviewFormData.implementationPlanItems || {}),
      [key]: [...(reviewFormData.implementationPlanItems?.[key] || []), '']
    };
  }

  function removeRepeatableItem({ key, index }) {
    if (!detailedDesignReviewRepeatableKeys.includes(key)) return;
    const rows = normalizeRepeatable(reviewFormData[key]);
    rows.splice(index, 1);
    reviewFormData[key] = rows.length ? rows : [''];
    const planRows = [...(reviewFormData.implementationPlanItems?.[key] || [])];
    planRows.splice(index, 1);
    reviewFormData.implementationPlanItems = {
      ...(reviewFormData.implementationPlanItems || {}),
      [key]: planRows.length ? planRows : ['']
    };
  }

  function updateImplementationPlanItem({ key, index, value }) {
    if (!detailedDesignReviewRepeatableKeys.includes(key)) return;
    const rows = [...(reviewFormData.implementationPlanItems?.[key] || [])];
    rows[index] = String(value ?? '');
    reviewFormData.implementationPlanItems = {
      ...(reviewFormData.implementationPlanItems || {}),
      [key]: rows
    };
  }

  function invalidateRequests() {
    reloadSequence += 1;
  }

  async function loadReviewForm(nodeKey, { sequence = ++reloadSequence } = {}) {
    if (!nodeKey || !id()) return;
    reviewFormLoading.value = true;
    localError.value = '';
    try {
      const dto = await getDetailedDesignReviewForm(id(), nodeKey, token());
      if (sequence !== reloadSequence || activeKey() !== nodeKey) return;
      reviewFormDtos[nodeKey] = dto;
      syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder()));
    } catch (error) {
      if (sequence === reloadSequence && activeKey() === nodeKey) {
        localError.value = toReadableApiError(error);
      }
    } finally {
      if (sequence === reloadSequence && activeKey() === nodeKey) {
        reviewFormLoading.value = false;
      }
    }
  }

  async function saveReviewForm(nodeKey) {
    const dto = await runAction(
      `review:${nodeKey}:save`,
      () => saveDetailedDesignReviewForm(id(), nodeKey, buildPayload(), token()),
      '设计评审记录表草稿已保存。'
    );
    if (dto) {
      reviewFormDtos[nodeKey] = dto;
      syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder()));
    }
  }

  async function submitReviewForm(nodeKey) {
    const dto = await runAction(
      `review:${nodeKey}:submit`,
      () => submitDetailedDesignReviewForm(id(), nodeKey, buildPayload(), token()),
      null
    );
    if (dto) {
      reviewFormDtos[nodeKey] = dto;
      syncObject(reviewFormData, normalizeForUi(dto.form?.formData, recorder()));
      showSubmitResult(dto);
    }
    return dto;
  }

  return {
    reviewFormDtos,
    reviewFormData,
    reviewFormLoading,
    isReviewNode,
    activeReviewFormDto,
    syncFromWorkflow,
    loadReviewForm,
    invalidateRequests,
    updateReviewFormField,
    repeatableItemsFor,
    updateRepeatableItem,
    updateImplementationPlanItem,
    addRepeatableItem,
    removeRepeatableItem,
    saveReviewForm,
    submitReviewForm
  };
}
