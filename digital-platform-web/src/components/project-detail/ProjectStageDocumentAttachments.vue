<template>
  <section class="stage-document-attachments" aria-label="资料项附件">
    <div class="stage-document-attachments__heading">
      <h4>资料附件</h4>
      <span>{{ readOnly ? readOnlyNote : '附件保存在在线平台；上传后资料是否完成以后端返回的完成状态为准，不自动推进阶段。' }}</span>
    </div>

    <div v-if="canViewAttachments && !readOnly" class="stage-document-attachment-upload">
      <template v-if="isApplicable(document) && canUploadAttachment">
        <el-upload
          class="stage-document-attachment-upload__button"
          :show-file-list="false"
          :disabled="state.uploadPending"
          :http-request="handleUploadRequest"
        >
          <el-button type="primary" :loading="state.uploadPending" :disabled="state.uploadPending">
            上传附件
          </el-button>
        </el-upload>
        <span class="inline-muted">单文件 50MB 以内，0 字节文件会被拒绝。</span>
      </template>
      <template v-else-if="isOnlineFormOnlyDocument">
        <span class="inline-muted">该资料通过在线表单提交，不使用附件上传入口。</span>
      </template>
      <template v-else-if="isApplicable(document)">
        <span class="inline-muted">当前账号无权上传该资料项附件。</span>
      </template>
      <template v-else>
        <span class="inline-muted">不适用资料项不能新增附件，已有附件仍可下载或删除。</span>
      </template>
    </div>
    <div v-else-if="canViewAttachments && readOnly" class="stage-document-attachment-upload">
      <span class="inline-muted">下方旧资料清单仅保留附件只读摘要；上传、下载和删除请到上方产出卡片处理。</span>
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
        <div v-if="!readOnly" class="stage-document-attachment-item__actions">
          <el-button
            v-if="canDownloadAttachment(attachment)" plain
            :disabled="state.downloadPendingId === attachment.id"
            @click="$emit('download', { document, attachment })"
          >
            {{ state.downloadPendingId === attachment.id ? '下载中...' : '下载' }}
          </el-button>
          <el-button
            v-if="canDeleteAttachment(attachment)" plain
            :disabled="state.deletePendingId === attachment.id"
            @click="$emit('delete', { document, attachment })"
          >
            {{ state.deletePendingId === attachment.id ? '删除中...' : '删除' }}
          </el-button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { formatDateTime, formatFileSize } from '../../utils/format.js';
import {
  formatAttachmentUploader,
  isApplicable,
  isInitiationOnlineFormDocument
} from './stageDocumentViewHelpers.js';

const emit = defineEmits(['upload', 'download', 'delete']);

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  readOnlyNote: {
    type: String,
    default: '附件只读展示；请到上方产出卡片处理附件操作。'
  }
});

function handleUploadRequest({ file }) {
  if (!file) {
    return Promise.resolve();
  }

  emit('upload', {
    document: props.document,
    file
  });
  return Promise.resolve();
}

const permissions = computed(() => props.document.permissions || {});
const isOnlineFormOnlyDocument = computed(() => isInitiationOnlineFormDocument(props.document));
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
