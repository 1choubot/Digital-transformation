import { reactive, ref, toValue, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  approveSolutionDesignWorkflowNode,
  assignSolutionDesignRoles,
  cancelSolutionDesignUploadExemption,
  downloadSolutionDesignWorkflowFile,
  markSolutionDesignUploadExemption,
  processSolutionDesignQuotationResult,
  returnSolutionDesignWorkflowNode,
  selectSolutionDesignQuotationTenderBranch,
  submitSolutionDesignQuotation,
  submitSolutionDesignWorkflowNode,
  toReadableApiError,
  uploadSolutionDesignWorkflowFile
} from '../../../api/projects.js';

export function saveSolutionDesignBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useSolutionDesignWorkflow({
  projectId,
  authToken,
  roleDefinitions,
  getNodeName,
  notifyChanged
}) {
  const roleSelections = reactive({});
  const pendingAction = ref('');
  // Kept as an internal bridge for the existing form composables; UI feedback is centralized in ElMessage.
  const localMessage = ref('');
  const localError = ref('');
  watch(localMessage, (value) => { if (value) ElMessage.success(value); });
  watch(localError, (value) => { if (value) ElMessage.error(value); });
  const returnReasons = reactive({});

  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';

  function isPending(key) {
    return pendingAction.value === key;
  }

  function clearLocalState() {
    localMessage.value = '';
    localError.value = '';
  }

  async function runAction(key, runner, successText, { notify = true } = {}) {
    if (pendingAction.value === key) {
      return null;
    }
    clearLocalState();
    pendingAction.value = key;
    try {
      const result = await runner();
      if (successText) ElMessage.success(successText);
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

  function syncRoleSelections(workflow) {
    for (const role of roleDefinitions) {
      roleSelections[role.payloadKey] = workflow?.roles?.[role.roleKey]?.userId
        ? String(workflow.roles[role.roleKey].userId)
        : '';
    }
  }

  function normalizeRequiredUserId(value) {
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
  }

  async function assignRoles() {
    const payload = {};
    for (const role of roleDefinitions) {
      const userId = normalizeRequiredUserId(roleSelections[role.payloadKey]);
      if (!userId) {
        ElMessage.error(`请选择${role.label}。`);
        return;
      }
      payload[role.payloadKey] = userId;
    }
    await runAction('roles', () => assignSolutionDesignRoles(id(), payload, token()), '方案设计项目内角色已保存。');
  }

  async function handleUpload(slot, event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      ElMessage.error('文件无效，请选择 1 字节到 50MB 以内的文件。');
      return;
    }
    const result = await runAction(
      `upload:${slot.slotKey}`,
      () => uploadSolutionDesignWorkflowFile(id(), slot.slotKey, file, token()),
      `${slot.slotName}已上传。`,
      { notify: false }
    );
    if (!result?.file) return;

    // Uploads are file-content mutations, not workflow transitions. Merge the
    // returned file into the current slot so the page and viewport stay stable.
    slot.currentFile = result.file;
    slot.hasCurrentFile = true;
    slot.currentFileHidden = false;
    slot.exemption = {
      ...(slot.exemption || {}),
      isExempted: false,
      reason: null,
      exemptedByUserId: null,
      exemptedByUser: null,
      exemptedAt: null
    };

    // The upload response only contains file state. Refresh through the shared
    // workspace protocol so backend-derived readiness and canSubmit permissions
    // can reveal the node submission card without reloading the browser page.
    notifyChanged?.({ changeType: 'upload', slotKey: slot.slotKey });
  }

  async function downloadUpload(slot) {
    await runAction(`download:${slot.slotKey}`, async () => {
      const download = await downloadSolutionDesignWorkflowFile(id(), slot.slotKey, token());
      saveSolutionDesignBlob(download, slot.currentFile?.originalFileName || slot.slotName);
    }, `${slot.slotName}已开始下载。`, { notify: false });
  }

  async function markUploadExemption(slot) {
    await runAction(
      `exemption:mark:${slot.slotKey}`,
      () => markSolutionDesignUploadExemption(id(), slot.slotKey, '', token()),
      `${slot.slotName}已标记为无需上传。`
    );
  }

  async function cancelUploadExemption(slot) {
    await runAction(
      `exemption:cancel:${slot.slotKey}`,
      () => cancelSolutionDesignUploadExemption(id(), slot.slotKey, token()),
      `${slot.slotName}已恢复为需要上传。`
    );
  }

  async function submitNode(nodeKey) {
    await runAction(`submit:${nodeKey}`, () => submitSolutionDesignWorkflowNode(id(), nodeKey, token()), `${getNodeName(nodeKey)}已提交。`);
  }

  async function approveNode(nodeKey, payload = {}) {
    await runAction(
      `approve:${nodeKey}`,
      () => approveSolutionDesignWorkflowNode(id(), nodeKey, payload, token()),
      `${getNodeName(nodeKey)}审批已通过。`
    );
  }

  async function returnNode(nodeKey) {
    const reason = String(returnReasons[nodeKey] || '').trim();
    if (!reason) {
      ElMessage.error('请填写退回原因。');
      return;
    }
    const result = await runAction(`return:${nodeKey}`, () => returnSolutionDesignWorkflowNode(id(), nodeKey, reason, token()), `${getNodeName(nodeKey)}已退回。`);
    if (result) delete returnReasons[nodeKey];
  }

  async function selectBranch(branchType) {
    const label = branchType === 'quotation' ? '报价流程' : branchType === 'tender' ? '投标流程' : branchType;
    await runAction(`branch:${branchType}`, () => selectSolutionDesignQuotationTenderBranch(id(), branchType, token()), `已选择${label}。`);
  }

  async function submitQuotation() {
    await runAction('quotation:submit', () => submitSolutionDesignQuotation(id(), token()), '报价单已提交。');
  }

  async function acceptQuotation() {
    await runAction('quotation:accept', () => processSolutionDesignQuotationResult(id(), { result: 'accepted' }, token()), '已记录客户接受报价。');
  }

  async function rejectQuotation(action) {
    const normalizedAction = action === 'end_project' ? 'end_project' : 'return_to_rd_cost';
    let reason = '';
    try {
      const result = await ElMessageBox.prompt(
        normalizedAction === 'end_project'
          ? '请填写结束项目原因。'
          : '请填写审批不通过原因。',
        normalizedAction === 'end_project' ? '结束项目确认' : '审批不通过确认',
        {
          type: 'warning',
          inputType: 'textarea',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消',
          inputValidator: (value) => Boolean(String(value || '').trim()) || '请填写原因'
        }
      );
      reason = String(result.value || '').trim();
    } catch {
      return;
    }
    await runAction(
      `quotation:reject:${normalizedAction}`,
      () => processSolutionDesignQuotationResult(
        id(),
        { result: 'rejected', action: normalizedAction, returnReason: reason },
        token()
      ),
      normalizedAction === 'end_project'
        ? '已记录客户不接受报价并结束项目。'
        : '已记录审批不通过并退回研发成本估算。'
    );
  }

  return {
    roleSelections, pendingAction, localMessage, localError, returnReasons,
    isPending, clearLocalState,
    runAction, syncRoleSelections, assignRoles, handleUpload, downloadUpload,
    markUploadExemption, cancelUploadExemption,
    submitNode, approveNode, returnNode, selectBranch, submitQuotation,
    acceptQuotation, rejectQuotation
  };
}
