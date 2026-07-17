import { computed, reactive, ref, toValue, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  approveContractSigningPaymentRelease,
  approveContractSigningPreparationFile,
  completeContractSigningAdvancePayment,
  confirmContractSigningScanFile,
  downloadContractSigningWorkflowFile,
  getContractSigningWorkflow,
  requestContractSigningPaymentRelease,
  returnContractSigningPreparationFile,
  toReadableApiError,
  uploadContractSigningWorkflowFile
} from '../../../api/projects.js';

export function saveContractSigningBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function unwrapWorkflowResponse(response) {
  return response?.workflow || response?.contractSigningWorkflow || response || null;
}

export function useContractSigningWorkflow({
  projectId,
  authToken,
  initialWorkflow = null,
  notifyChanged
}) {
  const workflow = ref(toValue(initialWorkflow) || null);
  const loading = ref(false);
  const errorMessage = ref('');
  const pendingAction = ref('');
  const returnReasons = reactive({});

  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';

  const nodes = computed(() => workflow.value?.nodes || []);
  const uploadSlots = computed(() => workflow.value?.uploadSlots || []);
  const paymentFlow = computed(() => workflow.value?.paymentFlow || null);
  const permissions = computed(() => workflow.value?.permissions || {});
  const blockingReasons = computed(() =>
    nodes.value.flatMap((node) => node.blockingReasons || [])
  );

  watch(
    () => toValue(initialWorkflow),
    (value) => {
      if (value) {
        workflow.value = value;
      }
    },
    { immediate: true }
  );

  function isPending(key) {
    return pendingAction.value === key;
  }

  function setWorkflow(value) {
    const nextWorkflow = unwrapWorkflowResponse(value);
    if (nextWorkflow) {
      workflow.value = nextWorkflow;
    }
  }

  async function load() {
    loading.value = true;
    errorMessage.value = '';

    try {
      const response = await getContractSigningWorkflow(id(), token());
      setWorkflow(response);
      return workflow.value;
    } catch (error) {
      errorMessage.value = toReadableApiError(error);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function runAction(key, runner, successText, { notify = true } = {}) {
    if (pendingAction.value === key) {
      return null;
    }

    pendingAction.value = key;
    errorMessage.value = '';

    try {
      const result = await runner();
      setWorkflow(result);
      if (successText) {
        ElMessage.success(successText);
      }
      if (notify) {
        notifyChanged?.();
      }
      return result;
    } catch (error) {
      ElMessage.error(toReadableApiError(error));
      return null;
    } finally {
      if (pendingAction.value === key) {
        pendingAction.value = '';
      }
    }
  }

  async function handleUpload(slot, event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      ElMessage.error('文件无效，请选择 1 字节到 50MB 以内的文件。');
      return;
    }

    await runAction(
      `upload:${slot.slotKey}`,
      () => uploadContractSigningWorkflowFile(id(), slot.slotKey, file, token()),
      `${slot.slotName}已上传。`
    );
  }

  async function downloadUpload(slot) {
    await runAction(
      `download:${slot.slotKey}`,
      async () => {
        const download = await downloadContractSigningWorkflowFile(id(), slot.slotKey, token());
        saveContractSigningBlob(download, slot.currentFile?.originalFileName || slot.slotName);
      },
      `${slot.slotName}已开始下载。`,
      { notify: false }
    );
  }

  async function approvePreparationSlot(slot) {
    try {
      await ElMessageBox.confirm(`确认通过“${slot.slotName}”吗？`, '审批确认', {
        type: 'warning',
        confirmButtonText: '审批通过',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      `approve:${slot.slotKey}`,
      () => approveContractSigningPreparationFile(id(), slot.slotKey, token()),
      `${slot.slotName}审批已通过。`
    );
  }

  async function returnPreparationSlot(slot) {
    const reason = String(returnReasons[slot.slotKey] || '').trim();
    if (!reason) {
      ElMessage.error('请填写退回原因。');
      return;
    }

    try {
      await ElMessageBox.confirm(`确认退回“${slot.slotName}”吗？`, '退回确认', {
        type: 'warning',
        confirmButtonText: '确认退回',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    const result = await runAction(
      `return:${slot.slotKey}`,
      () => returnContractSigningPreparationFile(id(), slot.slotKey, reason, token()),
      `${slot.slotName}已退回。`
    );
    if (result) {
      delete returnReasons[slot.slotKey];
    }
  }

  async function confirmSigningResult(slot, result) {
    const approved = result === 'approved';
    const returnReason = String(returnReasons[slot.slotKey] || '').trim();
    if (!approved && !returnReason) {
      ElMessage.error('请填写不通过原因。');
      return;
    }

    try {
      await ElMessageBox.confirm(
        approved
          ? `确认“${slot.slotName}”线下签署结果通过吗？`
          : `确认“${slot.slotName}”线下签署结果不通过吗？`,
        '确认线下签署结果',
        {
          type: approved ? 'warning' : 'error',
          confirmButtonText: approved ? '确认通过' : '确认不通过',
          cancelButtonText: '取消'
        }
      );
    } catch {
      return;
    }

    const response = await runAction(
      `signing:${slot.slotKey}:${result}`,
      () =>
        confirmContractSigningScanFile(
          id(),
          slot.slotKey,
          approved ? { result: 'approved' } : { result: 'returned', returnReason },
          token()
        ),
      approved
        ? `${slot.slotName}线下签署结果已确认通过。`
        : `${slot.slotName}线下签署结果已确认不通过。`
    );
    if (response && !approved) {
      delete returnReasons[slot.slotKey];
    }
  }

  async function completePayment() {
    try {
      await ElMessageBox.confirm('确认项目预付款已完成支付吗？', '预付款处理', {
        type: 'warning',
        confirmButtonText: '完成支付',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'payment:complete',
      () => completeContractSigningAdvancePayment(id(), token()),
      '项目预付款已标记完成。'
    );
  }

  async function requestGeneralManagerRelease() {
    try {
      await ElMessageBox.confirm('确认预付款未完成，并提交总经理审批放行吗？', '预付款放行申请', {
        type: 'warning',
        confirmButtonText: '提交总经理审批',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'payment:request-release',
      () => requestContractSigningPaymentRelease(id(), token()),
      '已提交总经理审批预付款放行。'
    );
  }

  async function approvePaymentRelease() {
    try {
      await ElMessageBox.confirm('确认通过预付款放行吗？', '总经理放行', {
        type: 'warning',
        confirmButtonText: '通过',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'payment:approve-release',
      () => approveContractSigningPaymentRelease(id(), token()),
      '总经理预付款放行已通过。'
    );
  }

  return {
    workflow,
    nodes,
    uploadSlots,
    paymentFlow,
    permissions,
    blockingReasons,
    loading,
    errorMessage,
    pendingAction,
    returnReasons,
    isPending,
    setWorkflow,
    load,
    runAction,
    handleUpload,
    downloadUpload,
    approvePreparationSlot,
    returnPreparationSlot,
    confirmSigningResult,
    completePayment,
    requestGeneralManagerRelease,
    approvePaymentRelease
  };
}
