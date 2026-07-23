import { computed, reactive, ref, toValue, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  approveContractSigningPaymentReleasePaid,
  approveContractSigningPaymentReleaseUnpaid,
  approveContractSigningPreparationFile,
  completeContractSigningAdvancePayment,
  completeContractSigningNode,
  downloadContractSigningKickoffNoticeGeneratedFile,
  downloadContractSigningWorkflowFile,
  getContractSigningWorkflow,
  requestContractSigningPaymentRelease,
  returnContractSigningSalesContractForCustomer,
  returnContractSigningTechnicalAgreementForCustomer,
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
  const kickoffNoticeGeneratedFile = computed(() =>
    workflow.value?.kickoffNoticeGeneratedFile ||
    paymentFlow.value?.kickoffNoticeGeneratedFile ||
    null
  );
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

  async function downloadKickoffNoticeGeneratedFile() {
    const generatedFile = kickoffNoticeGeneratedFile.value;
    await runAction(
      'download:kickoff-notice-generated-file',
      async () => {
        const download = await downloadContractSigningKickoffNoticeGeneratedFile(id(), token());
        saveContractSigningBlob(download, generatedFile?.fileName || generatedFile?.downloadableFileName || '项目启动通知.docx');
      },
      '项目启动通知已开始下载。',
      { notify: false }
    );
  }

  async function approvePreparationSlot(slot) {
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

    const result = await runAction(
      `return:${slot.slotKey}`,
      () => returnContractSigningPreparationFile(id(), slot.slotKey, reason, token()),
      `${slot.slotName}已退回。`
    );
    if (result) {
      delete returnReasons[slot.slotKey];
    }
  }

  async function returnTechnicalAgreementForCustomer() {
    const returnReason = String(returnReasons.technical_agreement || '').trim();
    if (!returnReason) {
      ElMessage.error('请填写客户退回原因。');
      return;
    }

    try {
      await ElMessageBox.confirm('确认客户退回技术协议，并返回准备线重提吗？', '客户退回确认', {
        type: 'warning',
        confirmButtonText: '退回技术协议',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    const response = await runAction(
      'signing:return-technical-agreement',
      () => returnContractSigningTechnicalAgreementForCustomer(id(), returnReason, token()),
      '技术协议已按客户退回返回准备线。'
    );
    if (response) {
      delete returnReasons.technical_agreement;
    }
  }

  async function returnSalesContractForCustomer() {
    const returnReason = String(returnReasons.sales_contract || '').trim();
    if (!returnReason) {
      ElMessage.error('请填写客户退回原因。');
      return;
    }

    try {
      await ElMessageBox.confirm('确认客户退回销售合同，并返回准备线重提吗？', '客户退回确认', {
        type: 'warning',
        confirmButtonText: '退回销售合同',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    const response = await runAction(
      'signing:return-sales-contract',
      () => returnContractSigningSalesContractForCustomer(id(), returnReason, token()),
      '销售合同已按客户退回返回准备线。'
    );
    if (response) {
      delete returnReasons.sales_contract;
    }
  }

  async function completeSigning() {
    try {
      await ElMessageBox.confirm('确认两份扫描件已齐备，并完成签订协议和合同节点吗？', '签订完成确认', {
        type: 'warning',
        confirmButtonText: '完成',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'signing:complete',
      () => completeContractSigningNode(id(), token()),
      '签订协议和合同节点已完成。'
    );
  }

  async function completePayment() {
    try {
      await ElMessageBox.confirm('确认项目预付款已完成支付吗？确认后将生成项目启动通知，并自动推进到详细设计阶段。', '预付款处理', {
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
      '项目预付款已完成，项目启动通知已生成。'
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

  async function approvePaymentReleaseUnpaid() {
    try {
      await ElMessageBox.confirm('确认客户仍未付款，但允许项目继续吗？确认后将生成项目启动通知，并自动推进到详细设计阶段。', '总经理放行', {
        type: 'warning',
        confirmButtonText: '未付款并通过',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'payment:approve-release-unpaid',
      () => approveContractSigningPaymentReleaseUnpaid(id(), token()),
      '总经理已确认未付款并通过，项目启动通知已生成。'
    );
  }

  async function approvePaymentReleasePaid() {
    try {
      await ElMessageBox.confirm('确认等待期间客户已付款，并允许项目继续吗？确认后将生成项目启动通知，并自动推进到详细设计阶段。', '总经理放行', {
        type: 'warning',
        confirmButtonText: '已付款通过',
        cancelButtonText: '取消'
      });
    } catch {
      return;
    }

    await runAction(
      'payment:approve-release-paid',
      () => approveContractSigningPaymentReleasePaid(id(), token()),
      '总经理已确认已付款通过，项目启动通知已生成。'
    );
  }

  return {
    workflow,
    nodes,
    uploadSlots,
    paymentFlow,
    kickoffNoticeGeneratedFile,
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
    downloadKickoffNoticeGeneratedFile,
    approvePreparationSlot,
    returnPreparationSlot,
    returnTechnicalAgreementForCustomer,
    returnSalesContractForCustomer,
    completeSigning,
    completePayment,
    requestGeneralManagerRelease,
    approvePaymentReleaseUnpaid,
    approvePaymentReleasePaid
  };
}
