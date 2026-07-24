import { reactive, ref, toValue, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  approveDetailedDesignDrawingReview,
  approveDetailedDesignWorkflowNode,
  assignDetailedDesignRoles,
  cancelDetailedDesignUploadNoUpload,
  downloadDetailedDesignDrawingReviewRecord,
  downloadDetailedDesignWorkflowFile,
  downloadDetailedDesignReviewGeneratedFile,
  markDetailedDesignUploadNoUpload,
  passDetailedDesignDrawingReview,
  returnDetailedDesignDrawingReview,
  returnDetailedDesignDrawingReviewApproval,
  returnDetailedDesignWorkflowNode,
  submitDetailedDesignWorkflowNode,
  toReadableApiError,
  uploadDetailedDesignDrawingReviewRecord,
  uploadDetailedDesignWorkflowFile
} from '../../../api/projects.js';

export function saveDetailedDesignBlob(download, fallbackName) {
  const url = URL.createObjectURL(download.blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = download.fileName || fallbackName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useDetailedDesignWorkflow({
  projectId,
  authToken,
  roleDefinitions = [],
  getNodeName,
  notifyChanged
}) {
  const roleSelections = reactive({});
  const pendingAction = ref('');
  const localError = ref('');
  const returnReasons = reactive({});

  watch(localError, (value) => { if (value) ElMessage.error(value); });

  const id = () => toValue(projectId);
  const token = () => toValue(authToken) || '';

  function isPending(key) {
    return pendingAction.value === key;
  }

  function clearLocalState() {
    localError.value = '';
  }

  async function runAction(key, runner, successText, { notify = true } = {}) {
    if (pendingAction.value === key) {
      return null;
    }
    localError.value = '';
    pendingAction.value = key;
    try {
      const result = await runner();
      if (successText) ElMessage.success(successText);
      if (notify) notifyChanged?.();
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

  async function approveNode(nodeKey, payload = {}) {
    await runAction(
      `approve:${nodeKey}`,
      () => approveDetailedDesignWorkflowNode(id(), nodeKey, payload, token()),
      `${getNodeName(nodeKey)}审批已通过。`
    );
  }

  async function returnNode(nodeKey) {
    const reason = String(returnReasons[nodeKey] || '').trim();
    if (!reason) {
      ElMessage.error('请填写退回原因。');
      return;
    }
    const result = await runAction(
      `return:${nodeKey}`,
      () => returnDetailedDesignWorkflowNode(id(), nodeKey, reason, token()),
      `${getNodeName(nodeKey)}已退回详细设计。`
    );
    if (result) {
      delete returnReasons[nodeKey];
    }
  }

  async function downloadReviewGeneratedFile(nodeKey, generatedFile) {
    await runAction(
      `review:${nodeKey}:download`,
      async () => {
        const download = await downloadDetailedDesignReviewGeneratedFile(id(), nodeKey, token());
        saveDetailedDesignBlob(download, generatedFile?.fileName || '设计评审记录表.xlsx');
      },
      '设计评审记录表生成文件已开始下载。',
      { notify: false }
    );
  }

  async function uploadDrawingReviewRecord(file) {
    if (!file) return null;
    if (file.size <= 0 || file.size > 200 * 1024 * 1024) {
      ElMessage.error('文件无效，请选择 1 字节到 200MB 以内的文件。');
      return null;
    }

    return runAction(
      'drawing-review:record-upload',
      () => uploadDetailedDesignDrawingReviewRecord(id(), file, token()),
      '图纸审查记录已上传。'
    );
  }

  async function downloadDrawingReviewRecord(record) {
    await runAction(
      `drawing-review:record-download:${record?.id || ''}`,
      async () => {
        const download = await downloadDetailedDesignDrawingReviewRecord(id(), record.id, token());
        saveDetailedDesignBlob(download, record?.originalFileName || '图纸审查记录');
      },
      '图纸审查记录已开始下载。',
      { notify: false }
    );
  }

  async function passDrawingReview(comment = '') {
    return runAction(
      'drawing-review:pass',
      () => passDetailedDesignDrawingReview(id(), { comment }, token()),
      '图纸审查已通过，等待研发中心负责人审批。'
    );
  }

  async function returnDrawingReview(returnReason) {
    const reason = String(returnReason || '').trim();
    if (!reason) {
      ElMessage.error('请填写退回原因。');
      return null;
    }

    return runAction(
      'drawing-review:return',
      () => returnDetailedDesignDrawingReview(id(), reason, token()),
      '图纸审查已退回产品平面图。'
    );
  }

  async function approveDrawingReview(comment = '') {
    return runAction(
      'drawing-review:rd-approve',
      () => approveDetailedDesignDrawingReview(id(), { comment }, token()),
      '图纸审查审批已通过。'
    );
  }

  async function returnDrawingReviewApproval(returnReason) {
    const reason = String(returnReason || '').trim();
    if (!reason) {
      ElMessage.error('请填写退回原因。');
      return null;
    }

    return runAction(
      'drawing-review:rd-return',
      () => returnDetailedDesignDrawingReviewApproval(id(), reason, token()),
      '图纸审查审批已退回产品平面图。'
    );
  }

  function syncRoleSelections(workflow) {
    for (const role of roleDefinitions) {
      if (role.multiple) {
        roleSelections[role.payloadKey] = (workflow?.professionalGroupMembers || [])
          .map((member) => member.userId)
          .filter(Boolean)
          .map(String);
        continue;
      }

      roleSelections[role.payloadKey] = workflow?.roles?.[role.roleKey]?.userId
        ? String(workflow.roles[role.roleKey].userId)
        : '';
    }
  }

  function normalizeRequiredUserId(value) {
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
  }

  function normalizeOptionalUserIds(value) {
    return Array.isArray(value)
      ? [...new Set(value.map(Number).filter((item) => Number.isSafeInteger(item) && item > 0))]
      : [];
  }

  async function assignRoles() {
    const payload = {};

    for (const role of roleDefinitions) {
      if (role.multiple) {
        payload[role.payloadKey] = normalizeOptionalUserIds(roleSelections[role.payloadKey]);
        continue;
      }

      const userId = normalizeRequiredUserId(roleSelections[role.payloadKey]);
      if (!userId) {
        ElMessage.error(`请选择${role.label}。`);
        return;
      }
      payload[role.payloadKey] = userId;
    }

    await runAction('roles', () => assignDetailedDesignRoles(id(), payload, token()), '详细设计角色分配已保存。');
  }

  async function handleUpload(slot, event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;

    if (file.size <= 0 || file.size > 200 * 1024 * 1024) {
      ElMessage.error('文件无效，请选择 1 字节到 200MB 以内的文件。');
      return;
    }

    const workflow = await runAction(
      `upload:${slot.slotKey}`,
      () => uploadDetailedDesignWorkflowFile(id(), slot.slotKey, file, token()),
      `${slot.slotName}已上传。`,
      { notify: false }
    );

    if (workflow?.uploadSlots) {
      const refreshedSlot = workflow.uploadSlots.find((item) => item.slotKey === slot.slotKey);
      if (refreshedSlot) {
        Object.assign(slot, refreshedSlot);
      }
    }

    if (workflow) {
      notifyChanged?.({ changeType: 'upload', slotKey: slot.slotKey });
    }
  }

  async function markUploadNoUpload(slot) {
    if (!slot?.slotKey) return null;
    const workflow = await runAction(
      `no-upload:${slot.slotKey}`,
      () => markDetailedDesignUploadNoUpload(id(), slot.slotKey, token()),
      `${slot.slotName}已标记为无需上传。`,
      { notify: false }
    );

    if (workflow?.uploadSlots) {
      const refreshedSlot = workflow.uploadSlots.find((item) => item.slotKey === slot.slotKey);
      if (refreshedSlot) Object.assign(slot, refreshedSlot);
    }
    if (workflow) notifyChanged?.({ changeType: 'no-upload', slotKey: slot.slotKey });
    return workflow;
  }

  async function cancelUploadNoUpload(slot) {
    if (!slot?.slotKey) return null;
    const workflow = await runAction(
      `cancel-no-upload:${slot.slotKey}`,
      () => cancelDetailedDesignUploadNoUpload(id(), slot.slotKey, token()),
      `${slot.slotName}已取消无需上传。`,
      { notify: false }
    );

    if (workflow?.uploadSlots) {
      const refreshedSlot = workflow.uploadSlots.find((item) => item.slotKey === slot.slotKey);
      if (refreshedSlot) Object.assign(slot, refreshedSlot);
    }
    if (workflow) notifyChanged?.({ changeType: 'cancel-no-upload', slotKey: slot.slotKey });
    return workflow;
  }

  async function submitNode(node) {
    if (!node?.nodeKey) return null;
    return runAction(
      `submit:${node.nodeKey}`,
      () => submitDetailedDesignWorkflowNode(id(), node.nodeKey, token()),
      `${node.nodeName || '节点'}已提交。`,
      { notify: true }
    );
  }

  async function downloadUpload(slot) {
    await runAction(
      `download:${slot.slotKey}`,
      async () => {
        const download = await downloadDetailedDesignWorkflowFile(id(), slot.slotKey, token());
        saveDetailedDesignBlob(download, slot.currentFile?.originalFileName || slot.slotName);
      },
      `${slot.slotName}已开始下载。`,
      { notify: false }
    );
  }

  return {
    roleSelections,
    pendingAction,
    localError,
    returnReasons,
    isPending,
    clearLocalState,
    runAction,
    syncRoleSelections,
    assignRoles,
    handleUpload,
    markUploadNoUpload,
    cancelUploadNoUpload,
    submitNode,
    downloadUpload,
    approveNode,
    returnNode,
    downloadReviewGeneratedFile,
    uploadDrawingReviewRecord,
    downloadDrawingReviewRecord,
    passDrawingReview,
    returnDrawingReview,
    approveDrawingReview,
    returnDrawingReviewApproval
  };
}
