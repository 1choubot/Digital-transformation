import { computed, ref, watch } from 'vue';

const emptyObject = Object.freeze({});

function normalizeNodeCodes(value, props) {
  const source = typeof value === 'function' ? value(props) : value;
  if (Array.isArray(source)) {
    return source.filter(Boolean);
  }
  if (source) {
    return [source];
  }
  return props.node?.nodeKey ? [props.node.nodeKey] : [];
}

export function useNodeOnlineForm({ props, emit, documentCode, affectedNodeCodes } = {}) {
  const requestedDocumentId = ref(null);
  const context = computed(() => props.nodePageContext || emptyObject);
  const output = computed(() =>
    (props.node?.outputs || []).find(
      (item) => String(item.documentCode || item.legacyDocumentCode || '') === String(documentCode)
    ) || null
  );
  const isActiveOutputForm = computed(
    () =>
      output.value?.documentId &&
      String(context.value.activeOnlineFormDocumentId || '') === String(output.value.documentId)
  );
  const activeForm = computed(() =>
    isActiveOutputForm.value ? context.value.activeOnlineForm || null : null
  );
  const unavailableMessage = computed(() => {
    if (!output.value) {
      return `当前节点尚未返回 ${documentCode} 在线表单。`;
    }

    return '关联资料未初始化，暂不能打开在线表单。';
  });

  watch(
    () => output.value?.documentId || null,
    (documentId) => {
      requestedDocumentId.value = null;
      if (documentId) {
        openOnlineForm();
      }
    },
    { immediate: true }
  );

  watch(
    () => [
      output.value?.documentId || null,
      context.value.activeOnlineFormDocumentId || null,
      context.value.onlineFormLoading === true
    ],
    () => {
      openOnlineForm();
    }
  );

  function invoke(name, payload) {
    const handler = context.value?.[name];
    if (typeof handler === 'function') {
      return handler(payload);
    }
    return undefined;
  }

  function openOnlineForm() {
    const targetOutput = output.value;
    if (!targetOutput?.documentId || targetOutput.formAvailable !== true) {
      return;
    }

    if (isActiveOutputForm.value && activeForm.value) {
      return;
    }

    if (context.value.onlineFormLoading === true) {
      return;
    }

    if (String(requestedDocumentId.value || '') === String(targetOutput.documentId)) {
      return;
    }

    requestedDocumentId.value = targetOutput.documentId;
    invoke('openOnlineForm', targetOutput);
  }

  function notifyFormChanged(changedDocumentIds = []) {
    emit('business-state-changed', {
      changedDocumentIds: changedDocumentIds.length
        ? changedDocumentIds
        : output.value?.documentId
          ? [output.value.documentId]
          : [],
      affectedNodeCodes: normalizeNodeCodes(affectedNodeCodes, props),
      refreshCurrentDetail: true
    });
  }

  function saveOnlineForm() {
    invoke('saveOnlineForm');
    notifyFormChanged();
  }

  function submitOnlineForm() {
    invoke('submitOnlineForm');
    notifyFormChanged();
  }

  async function downloadOnlineFormFile() {
    const targetOutput = output.value;
    if (!targetOutput?.documentId) {
      return;
    }

    if (activeForm.value?.permissions?.canEdit) {
      const saved = await invoke('saveOnlineForm', { refreshWorkspace: false, showMessage: false });
      if (saved === false) {
        return;
      }
    }

    await invoke('downloadOnlineFormFile', targetOutput);
  }

  return {
    emptyObject,
    context,
    output,
    activeForm,
    unavailableMessage,
    invoke,
    saveOnlineForm,
    submitOnlineForm,
    downloadOnlineFormFile,
    notifyFormChanged
  };
}
