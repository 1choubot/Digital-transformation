<template>
  <section class="stage-document-attachments" aria-label="资料项附件">
    <div class="stage-document-attachments__heading">
      <h4>资料附件</h4>
      <span>上传仅用于资料项附件管理，不等于资料已确认，不自动推进阶段，也不代表文件管理平台归档。</span>
    </div>

    <div class="stage-document-attachment-upload">
      <template v-if="isApplicable(document)">
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
      <template v-else>
        <span class="inline-muted">不适用资料项不能新增附件，已有附件仍可下载或删除。</span>
      </template>
    </div>

    <section v-if="state.errorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ state.errorMessage }}</p>
    </section>

    <section v-if="state.loading" class="state-panel state-panel--inline">
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
            type="button"
            class="ghost-button"
            :disabled="state.downloadPendingId === attachment.id"
            @click="$emit('download', { document, attachment })"
          >
            {{ state.downloadPendingId === attachment.id ? '下载中...' : '下载' }}
          </button>
          <button
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
</script>
