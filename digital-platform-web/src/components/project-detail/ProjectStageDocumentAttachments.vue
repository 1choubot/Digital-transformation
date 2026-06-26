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

<style scoped>
/* ===== 外层容器 ===== */
.stage-document-attachments {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
}

/* ===== 头部 ===== */
.stage-document-attachments__heading {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.75rem;
}

.stage-document-attachments__heading h4 {
  font-size: 0.8rem;
  font-weight: 600;
  color: #606266;
  margin: 0;
  letter-spacing: 0.03em;
}

.stage-document-attachments__heading span {
  font-size: 0.75rem;
  color: #909399;
  line-height: 1.4;
}

/* ===== 上传区域 ===== */
.stage-document-attachment-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px dashed #dcdfe6;
}

.stage-document-attachment-upload__button {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 28px;
  white-space: nowrap;
}

.stage-document-attachment-upload__button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.stage-document-attachment-upload__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stage-document-attachment-upload__button input[type="file"] {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.stage-document-attachment-upload__button input[type="file"]:disabled {
  cursor: not-allowed;
}

.inline-muted {
  font-size: 0.75rem;
  color: #909399;
}

/* ===== 状态面板（错误/加载） ===== */
.state-panel {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.state-panel--error {
  background: #fef0f0;
  color: #f56c6c;
}

.state-panel p {
  margin: 0;
  font-size: 0.85rem;
}

/* ===== 空状态 ===== */
.stage-document-attachments__empty {
  font-size: 0.85rem;
  color: #909399;
  padding: 0.5rem 0;
  text-align: center;
  background: #fafbfc;
  border-radius: 4px;
}

/* ===== 附件列表 ===== */
.stage-document-attachment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stage-document-attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.4rem 0.6rem;
  background: #f8fafc;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  transition: background 0.15s ease;
}

.stage-document-attachment-item:hover {
  background: #f4f6f9;
}

.stage-document-attachment-item__main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.6rem;
  flex: 1;
  min-width: 150px;
}

.stage-document-attachment-item__main strong {
  font-size: 0.85rem;
  font-weight: 500;
  color: #303133;
  word-break: break-word;
}

.stage-document-attachment-item__main span {
  font-size: 0.7rem;
  color: #909399;
  white-space: nowrap;
}

.stage-document-attachment-item__actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.stage-document-attachment-item__actions .ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  white-space: nowrap;
}

.stage-document-attachment-item__actions .ghost-button:hover:not(:disabled) {
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #3e63dd;
}

.stage-document-attachment-item__actions .ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================================ */
/* ===== 响应式适配 ===== */
/* ============================================================ */

/* 768px 以下：附件项纵向排列 */
@media (max-width: 768px) {
  .stage-document-attachment-upload {
    flex-direction: column;
    align-items: stretch;
  }

  .stage-document-attachment-upload__button {
    width: 100%;
    justify-content: center;
  }

  .stage-document-attachment-item {
    flex-direction: column;
    align-items: stretch;
  }

  .stage-document-attachment-item__main {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }

  .stage-document-attachment-item__main span {
    white-space: normal;
  }

  .stage-document-attachment-item__actions {
    justify-content: flex-start;
  }
}

/* 480px 以下：进一步缩小内边距和字体 */
@media (max-width: 480px) {
  .stage-document-attachments {
    padding-top: 0.5rem;
  }

  .stage-document-attachments__heading h4 {
    font-size: 0.75rem;
  }

  .stage-document-attachments__heading span {
    font-size: 0.7rem;
  }

  .stage-document-attachment-upload {
    padding: 0.4rem 0.5rem;
  }

  .stage-document-attachment-upload__button {
    font-size: 0.7rem;
    height: 26px;
    padding: 0.2rem 0.6rem;
  }

  .inline-muted {
    font-size: 0.7rem;
  }

  .stage-document-attachment-item {
    padding: 0.3rem 0.5rem;
  }

  .stage-document-attachment-item__main strong {
    font-size: 0.8rem;
  }

  .stage-document-attachment-item__main span {
    font-size: 0.65rem;
  }

  .stage-document-attachment-item__actions .ghost-button {
    font-size: 0.65rem;
    height: 22px;
    padding: 0.1rem 0.5rem;
  }
}
</style>