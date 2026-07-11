import { reactive, ref, toValue } from 'vue';
import {
  deleteStageDocumentOnlineFormImage,
  downloadSolutionDesignAnalysisGeneratedFile,
  downloadStageDocumentOnlineFormImage,
  getSolutionDesignAnalysisForm,
  saveSolutionDesignAnalysisForm,
  submitSolutionDesignAnalysisForm,
  toReadableApiError,
  uploadStageDocumentOnlineFormImage
} from '../../../api/projects.js';
import { saveSolutionDesignBlob } from './useSolutionDesignWorkflow.js';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function syncObject(target, source = {}) {
  for (const key of Object.keys(target)) delete target[key];
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = Array.isArray(value) ? [...value] : value ?? '';
  }
}

export function useSolutionAnalysisForm({ projectId, authToken, runAction, localMessage, localError }) {
  const analysisFormDto = ref(null);
  const analysisFormData = reactive({});
  const analysisFormLoading = ref(false);
  const analysisImageState = reactive({ uploadPendingFieldKey: '', downloadPendingId: null, deletePendingId: null });
  let reloadSequence = 0;
  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';

  function buildDtoFromWorkflow(workflow) {
    const node = workflow?.nodes?.find((item) => item.nodeKey === 'solution_analysis');
    const form = workflow?.analysisForm || null;
    if (!node && !form) return null;
    return {
      projectId: workflow?.projectId,
      stageKey: workflow?.currentStage?.stageKey,
      nodeKey: 'solution_analysis',
      nodeStatus: node?.status,
      nodeRevision: node?.currentRevision || 1,
      form,
      permissions: {
        canViewForm: true,
        canEditForm: node?.permissions?.canEditAnalysisForm === true,
        canSubmitForm: node?.permissions?.canSubmitAnalysisForm === true,
        canSubmitNode: node?.permissions?.canSubmit === true,
        canApprove: node?.permissions?.canApprove === true,
        canReturn: node?.permissions?.canReturn === true
      },
      isProjectEnded: workflow?.isProjectEnded === true
    };
  }

  function syncFromWorkflow(workflow, active = false) {
    analysisFormDto.value = buildDtoFromWorkflow(workflow);
    if (active) syncObject(analysisFormData, analysisFormDto.value?.form?.formData);
  }

  async function loadAnalysisForm({ sequence = ++reloadSequence } = {}) {
    if (!id()) return;
    analysisFormLoading.value = true;
    localError.value = '';
    try {
      const dto = await getSolutionDesignAnalysisForm(id(), token());
      if (sequence !== reloadSequence) return;
      analysisFormDto.value = dto;
      syncObject(analysisFormData, dto.form?.formData);
    } catch (error) {
      if (sequence === reloadSequence) localError.value = toReadableApiError(error);
    } finally {
      if (sequence === reloadSequence) analysisFormLoading.value = false;
    }
  }

  function invalidateRequests() { reloadSequence += 1; }
  function updateAnalysisFormField({ key, value }) { analysisFormData[key] = value; }

  async function saveAnalysisForm() {
    const dto = await runAction('analysis:save', () => saveSolutionDesignAnalysisForm(id(), { ...analysisFormData }, token()), '项目方案分析表草稿已保存。');
    if (dto) { analysisFormDto.value = dto; syncObject(analysisFormData, dto.form?.formData); }
  }
  async function submitAnalysisForm() {
    const dto = await runAction('analysis:submit', () => submitSolutionDesignAnalysisForm(id(), { ...analysisFormData }, token()), '项目方案分析表已提交并触发模板生成。');
    if (dto) { analysisFormDto.value = dto; syncObject(analysisFormData, dto.form?.formData); }
  }
  async function downloadAnalysisGeneratedFile() {
    await runAction('analysis:download', async () => {
      const download = await downloadSolutionDesignAnalysisGeneratedFile(id(), token());
      saveSolutionDesignBlob(download, analysisFormDto.value?.form?.generatedFile?.fileName || '项目方案分析表.xlsx');
    }, '项目方案分析表生成文件已开始下载。', { notify: false });
  }

  function getImages() { const dto = analysisFormDto.value || {}; return Array.isArray(dto.images) ? dto.images : Array.isArray(dto.form?.images) ? dto.form.images : []; }
  function setImages(images) {
    const sorted = [...images].sort((a, b) => a.fieldKey !== b.fieldKey ? String(a.fieldKey).localeCompare(String(b.fieldKey)) : String(a.uploadedAt || '').localeCompare(String(b.uploadedAt || '')) || Number(a.id) - Number(b.id));
    const current = analysisFormDto.value;
    if (!current) return;
    analysisFormDto.value = { ...current, images: sorted, form: current.form ? { ...current.form, images: sorted } : current.form };
  }
  function markGeneratedFileOutdated() {
    const current = analysisFormDto.value;
    if (!current) return;
    const generatedFile = current.form?.generatedFile;
    analysisFormDto.value = { ...current, permissions: { ...current.permissions, canSubmitNode: false }, form: current.form ? { ...current.form, generatedFile: generatedFile ? { ...generatedFile, status: 'not_started', fileName: null, mimeType: null, fileSize: null, generatedAt: null, generatedByUserId: null, errorMessage: null, canDownload: false } : generatedFile } : current.form };
  }

  async function uploadAnalysisImage({ field, file }) {
    localError.value = ''; localMessage.value = '';
    const documentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
    if (!documentId || !analysisFormDto.value?.permissions?.canEditForm) { localError.value = '当前账号无权上传该在线表单图片。'; return; }
    const limit = Number(field?.maxImages) || 3;
    if (getImages().filter((image) => image.fieldKey === field.key).length >= limit) { localError.value = `该区域最多上传 ${limit} 张图片。`; return; }
    if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > MAX_IMAGE_SIZE) { localError.value = '图片文件无效，请选择 10MB 以内的 png/jpg/jpeg 图片。'; return; }
    analysisImageState.uploadPendingFieldKey = field.key;
    try {
      const image = await uploadStageDocumentOnlineFormImage(id(), documentId, field.key, file, token());
      setImages([...getImages().filter((item) => String(item.id) !== String(image.id)), { ...image, fieldKey: image.fieldKey || field.key }]);
      markGeneratedFileOutdated(); localMessage.value = '项目方案分析表图片已上传，请重新提交表单生成文件。';
    } catch (error) { localError.value = toReadableApiError(error); } finally { analysisImageState.uploadPendingFieldKey = ''; }
  }
  async function downloadAnalysisImage({ image }) {
    localError.value = ''; localMessage.value = '';
    const documentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
    if (!documentId || !image?.id) { localError.value = '图片尚不可下载。'; return; }
    analysisImageState.downloadPendingId = image.id;
    try { const download = await downloadStageDocumentOnlineFormImage(id(), documentId, image.id, token()); saveSolutionDesignBlob(download, image.originalFileName || '项目方案分析表图片'); }
    catch (error) { localError.value = toReadableApiError(error); } finally { analysisImageState.downloadPendingId = null; }
  }
  async function deleteAnalysisImage({ image }) {
    localError.value = ''; localMessage.value = '';
    const documentId = analysisFormDto.value?.stageDocumentId || analysisFormDto.value?.form?.stageDocumentId;
    if (!documentId || !image?.id) { localError.value = '图片尚不可删除。'; return; }
    analysisImageState.deletePendingId = image.id;
    try { await deleteStageDocumentOnlineFormImage(id(), documentId, image.id, token()); setImages(getImages().filter((item) => String(item.id) !== String(image.id))); markGeneratedFileOutdated(); localMessage.value = '项目方案分析表图片已删除，请重新提交表单生成文件。'; }
    catch (error) { localError.value = toReadableApiError(error); } finally { analysisImageState.deletePendingId = null; }
  }

  return { analysisFormDto, analysisFormData, analysisFormLoading, analysisImageState, syncFromWorkflow, loadAnalysisForm, invalidateRequests, updateAnalysisFormField, saveAnalysisForm, submitAnalysisForm, downloadAnalysisGeneratedFile, uploadAnalysisImage, downloadAnalysisImage, deleteAnalysisImage };
}
