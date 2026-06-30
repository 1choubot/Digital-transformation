<template>
  <section class="stage-document-attachments" aria-label="资料项附件">
    <div class="stage-document-attachments__heading">
      <h4>资料附件</h4>
      <span>附件保存在在线平台；上传后资料是否完成以后端返回的完成状态为准，不自动推进阶段。</span>
    </div>

    <div v-if="canViewAttachments" class="stage-document-attachment-upload">
      <template v-if="isApplicable(document) && canUploadAttachment">
        <label class="ghost-button stage-document-attachment-upload__button">
          <span>{{ state.uploadPending ? '上传中...' : '上传附件' }}</span>
          <input
            type="file"
            :disabled="state.uploadPending"
            @change="handleFileSelected"
          />
        </label>
        <span class="inline-muted">单文件 50MB 以内，0 字节文件会被拒绝。</span>
      </template>
      <template v-else-if="isApplicable(document)">
        <span class="inline-muted">当前账号无权上传该资料项附件。</span>
      </template>
      <template v-else>
        <span class="inline-muted">不适用资料项不能新增附件，已有附件仍可下载或删除。</span>
      </template>
    </div>

    <section v-if="state.errorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ state.errorMessage }}</p>
    </section>

    <section v-if="!canViewAttachments" class="stage-document-attachments__empty">
      当前账号无权查看该资料项附件。
    </section>

    <section v-else-if="state.loading" class="state-panel state-panel--inline">
      <p>正在加载附件...</p>
    </section>

    <section v-else-if="state.attachments.length === 0" class="stage-document-attachments__empty">
      暂无附件。
    </section>

    <ul v-else class="stage-document-attachment-list">
      <li
        v-for="attachment in state.attachments"
        :key="attachment.id"
        class="stage-document-attachment-item"
      >
        <div class="stage-document-attachment-item__main">
          <strong>{{ attachment.originalFileName }}</strong>
          <span>
            {{ formatFileSize(attachment.fileSize) }}
            / {{ formatAttachmentUploader(attachment) }}
            / {{ formatDateTime(attachment.uploadedAt) }}
          </span>
        </div>
        <div class="stage-document-attachment-item__actions">
          <button
            v-if="canDownloadAttachment(attachment)"
            type="button"
            class="ghost-button"
            :disabled="state.downloadPendingId === attachment.id"
            @click="$emit('download', { document, attachment })"
          >
            {{ state.downloadPendingId === attachment.id ? '下载中...' : '下载' }}
          </button>
          <button
            v-if="canDeleteAttachment(attachment)"
            type="button"
            class="ghost-button"
            :disabled="state.deletePendingId === attachment.id"
            @click="$emit('delete', { document, attachment })"
          >
            {{ state.deletePendingId === attachment.id ? '删除中...' : '删除' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { formatDateTime, formatFileSize } from '../../utils/format.js';
import { formatAttachmentUploader, isApplicable } from './stageDocumentViewHelpers.js';

const emit = defineEmits(['upload', 'download', 'delete']);

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  }
});

function handleFileSelected(event) {
  const file = event.target.files?.[0] || null;
  event.target.value = '';

  if (!file) {
    return;
  }

  emit('upload', {
    document: props.document,
    file
  });
}

const permissions = computed(() => props.document.permissions || {});
const canViewAttachments = computed(
  () => permissions.value.canViewAttachments ?? props.document.canViewAttachments ?? false
);
const canUploadAttachment = computed(
  () => permissions.value.canUploadAttachment ?? props.document.canUploadAttachment ?? false
);

function canDownloadAttachment(attachment) {
  return (
    attachment?.permissions?.canDownload ??
    attachment?.canDownload ??
    permissions.value.canDownloadAttachment ??
    props.document.canDownloadAttachment ??
    false
  );
}

function canDeleteAttachment(attachment) {
  return (
    attachment?.permissions?.canDelete ??
    attachment?.canDelete ??
    permissions.value.canDeleteAttachment ??
    props.document.canDeleteAttachment ??
    false
  );
}
</script>
