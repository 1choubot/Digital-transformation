<template>
  <section class="stage-document-attachments">
    <!-- 标题行 -->
    <div class="attachments-header">
      <div class="attachments-header__left">
        <span class="attachments-eyebrow">资料附件</span>
        <p class="attachments-hint">
          上传仅用于资料项附件管理，不等于资料已确认，不自动推进阶段，也不代表文件管理平台归档。
        </p>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="attachments-upload">
      <template v-if="isApplicable(document)">
        <label class="upload-button" :class="{ 'upload-button--loading': state.uploadPending }">
          <svg class="upload-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{{ state.uploadPending ? '上传中...' : '上传附件' }}</span>
          <input
            type="file"
            :disabled="state.uploadPending"
            @change="handleFileSelected"
          />
        </label>
        <span class="upload-hint">单文件 50MB 以内，0 字节文件会被拒绝。</span>
      </template>
      <template v-else>
        <span class="upload-hint upload-hint--muted">不适用资料项不能新增附件，已有附件仍可下载或删除。</span>
      </template>
    </div>

    <!-- 错误信息 -->
    <div v-if="state.errorMessage" class="attachments-error">
      <svg class="attachments-error__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ state.errorMessage }}</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="state.loading" class="attachments-loading">
      <span class="loading-spinner"></span>
      <span>正在加载附件...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="state.attachments.length === 0" class="attachments-empty">
      <svg class="attachments-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
      <span>暂无附件</span>
    </div>

    <!-- 附件列表 -->
    <ul v-else class="attachments-list">
      <li
        v-for="attachment in state.attachments"
        :key="attachment.id"
        class="attachment-item"
      >
        <div class="attachment-item__info">
          <svg class="attachment-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <div class="attachment-item__meta">
            <strong class="attachment-item__name">{{ attachment.originalFileName }}</strong>
            <span class="attachment-item__details">
              {{ formatFileSize(attachment.fileSize) }}
              · {{ formatAttachmentUploader(attachment) }}
              · {{ formatDateTime(attachment.uploadedAt) }}
            </span>
          </div>
        </div>
        <div class="attachment-item__actions">
          <button
            type="button"
            class="action-button action-button--download"
            :disabled="state.downloadPendingId === attachment.id"
            @click="$emit('download', { document, attachment })"
          >
            <svg class="action-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ state.downloadPendingId === attachment.id ? '下载中...' : '下载' }}
          </button>
          <button
            type="button"
            class="action-button action-button--delete"
            :disabled="state.deletePendingId === attachment.id"
            @click="$emit('delete', { document, attachment })"
          >
            <svg class="action-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
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
/* ============================================================ */
/* 基础容器 */
/* ============================================================ */
.stage-document-attachments {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0;
}

/* ============================================================ */
/* 标题行 */
/* ============================================================ */
.attachments-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.attachments-header__left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attachments-eyebrow {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.1rem 0.6rem;
  border-radius: 12px;
  width: fit-content;
}

.attachments-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.5;
}

/* ============================================================ */
/* 上传区域 */
/* ============================================================ */
.attachments-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.5rem 0 0.25rem 0;
}

.upload-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1.2rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #1e293b;
  background: #ffffff;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.4;
  min-height: 38px;
}

.upload-button:hover:not(.upload-button--loading) {
  background: #f8fafc;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.upload-button--loading {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f1f5f9;
}

.upload-button input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.upload-button--loading input[type="file"] {
  cursor: not-allowed;
}

.upload-button__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  stroke: #475569;
}

.upload-button:hover:not(.upload-button--loading) .upload-button__icon {
  stroke: #1e293b;
}

.upload-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.upload-hint--muted {
  color: #94a3b8;
  background: #f8fafc;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

/* ============================================================ */
/* 错误信息 */
/* ============================================================ */
.attachments-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.8rem;
}

.attachments-error__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  stroke: #dc2626;
}

/* ============================================================ */
/* 加载状态 */
/* ============================================================ */
.attachments-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #475569;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================================================ */
/* 空状态 */
/* ============================================================ */
.attachments-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px dashed #e2e8f0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.attachments-empty__icon {
  width: 32px;
  height: 32px;
  stroke: #cbd5e1;
}

/* ============================================================ */
/* 附件列表 */
/* ============================================================ */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.attachment-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.6rem 1rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  transition: all 0.15s ease;
}

.attachment-item:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.attachment-item__info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1 1 200px;
  min-width: 0;
}

.attachment-item__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  stroke: #64748b;
}

.attachment-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.attachment-item__name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.3;
}

.attachment-item__details {
  font-size: 0.7rem;
  color: #94a3b8;
  line-height: 1.3;
}

.attachment-item__actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ============================================================ */
/* 操作按钮 */
/* ============================================================ */
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.8rem;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  border-radius: 30px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  line-height: 1.3;
  min-height: 30px;
  white-space: nowrap;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.action-button__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: currentColor;
}

/* 下载按钮 */
.action-button--download {
  background: #ffffff;
  border-color: #e2e8f0;
  color: #475569;
}

.action-button--download:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #818cf8;
  color: #4338ca;
}

/* 删除按钮 */
.action-button--delete {
  background: #ffffff;
  border-color: #e2e8f0;
  color: #475569;
}

.action-button--delete:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* ============================================================ */
/* 响应式 */
/* ============================================================ */
@media (max-width: 768px) {
  .stage-document-attachments {
    gap: 0.75rem;
  }

  .attachments-header {
    flex-direction: column;
    gap: 0.4rem;
  }

  .attachments-upload {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .upload-button {
    justify-content: center;
    min-height: 36px;
    padding: 0.35rem 1rem;
  }

  .attachment-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 0.6rem 0.8rem;
  }

  .attachment-item__info {
    flex: 1 1 auto;
  }

  .attachment-item__actions {
    justify-content: flex-start;
    gap: 0.4rem;
  }

  .action-button {
    min-height: 28px;
    padding: 0.2rem 0.7rem;
    font-size: 0.65rem;
  }

  .attachments-hint {
    font-size: 0.75rem;
  }

  .upload-hint {
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .attachment-item {
    padding: 0.5rem 0.6rem;
  }

  .attachment-item__name {
    font-size: 0.8rem;
  }

  .attachment-item__details {
    font-size: 0.6rem;
  }

  .action-button {
    min-height: 24px;
    padding: 0.15rem 0.5rem;
    font-size: 0.6rem;
    gap: 0.2rem;
  }

  .action-button__icon {
    width: 12px;
    height: 12px;
  }

  .upload-button {
    font-size: 0.75rem;
    min-height: 32px;
    padding: 0.25rem 0.8rem;
  }

  .upload-button__icon {
    width: 16px;
    height: 16px;
  }

  .attachments-error {
    font-size: 0.75rem;
    padding: 0.4rem 0.7rem;
  }

  .attachments-empty {
    padding: 1rem 0.75rem;
    font-size: 0.75rem;
  }

  .attachments-empty__icon {
    width: 24px;
    height: 24px;
  }

  .attachments-loading {
    font-size: 0.75rem;
    padding: 0.75rem 0.25rem;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
  }
}
</style>