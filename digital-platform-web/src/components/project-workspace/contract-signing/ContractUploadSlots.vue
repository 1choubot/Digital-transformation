<template>
  <section v-if="slots.length" class="contract-upload-section">
    <h4>{{ sectionTitle }}</h4>
    <div class="contract-upload-table" role="table" :aria-label="sectionTitle">
      <div class="contract-upload-table__head" role="row">
        <span role="columnheader">上传内容</span>
        <span role="columnheader">文件信息</span>
        <span role="columnheader">状态</span>
        <span role="columnheader">操作</span>
      </div>

      <div v-for="slot in slots" :key="slot.slotKey" class="contract-upload-table__group" role="rowgroup">
        <div class="contract-upload-table__row" role="row">
          <strong class="contract-upload-table__title" role="cell" :title="slot.slotName">
            {{ slot.slotName }}
          </strong>
          <div class="contract-upload-table__file" role="cell" :title="displayFileName(slot)">
            <span>{{ displayFileName(slot) }}</span>
            <small v-if="slot.currentFile">
              {{ formatFileSize(slot.currentFile.fileSize) }} ·
              {{ formatUser(slot.currentFile.uploadedByUser) }} ·
              {{ formatDateTime(slot.currentFile.uploadedAt) }}
            </small>
          </div>
          <div class="contract-upload-table__status" role="cell">
            <el-tag size="small" :type="contractSlotStatusTagType(slot.status)">
              {{ contractUploadSlotStatusText[slot.status] || slot.status }} · v{{ slot.revision || 1 }}
            </el-tag>
          </div>
          <div class="contract-upload-table__actions" role="cell">
            <el-upload
              v-if="slot.permissions?.canUpload"
              :show-file-list="false"
              :auto-upload="true"
              :http-request="options => requestUpload(slot, options)"
            >
              <el-button type="primary" :loading="isPending(`upload:${slot.slotKey}`)">
                {{ uploadButtonText(slot) }}
              </el-button>
            </el-upload>
            <el-button
              v-if="slot.currentFile && slot.permissions?.canDownload"
              type="primary"
              plain
              :loading="isPending(`download:${slot.slotKey}`)"
              @click="$emit('download', slot)"
            >
              下载
            </el-button>
          </div>
        </div>

        <div v-if="slot.returnReason" class="contract-upload-table__feedback" role="row">
          <div role="cell">
            <el-alert
              :title="`退回原因：${slot.returnReason}`"
              type="warning"
              show-icon
              :closable="false"
            />
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import {
  contractSlotStatusTagType,
  contractUploadSlotStatusText,
  formatDateTime,
  formatFileSize,
  formatUser
} from '../../../composables/project-stage/contract-signing/contractSigningFormatters.js';

const emit = defineEmits([
  'upload',
  'download'
]);

defineProps({
  slots: { type: Array, default: () => [] },
  sectionTitle: { type: String, default: '上传文件' },
  isPending: { type: Function, required: true }
});

function uploadButtonText(slot) {
  if (slot.status === 'returned') {
    return '整改重传';
  }
  return slot.currentFile ? '重新上传' : '上传';
}

function requestUpload(slot, options) {
  emit('upload', slot, { target: { files: [options.file], value: '' } });
  options.onSuccess?.({});
  return Promise.resolve({ slot, file: options.file });
}

function displayFileName(slot) {
  return slot.currentFile?.originalFileName || '暂无当前有效文件';
}

</script>

<style scoped>
.contract-upload-section {
  display: grid;
  gap: var(--app-space-4);
}

.contract-upload-section h4 {
  margin: 0;
}

.contract-upload-table {
  width: 90%;
  min-width: 0;
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface);
}

.contract-upload-table__head,
.contract-upload-table__row {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(220px, 1.4fr) minmax(130px, 0.7fr) minmax(240px, 1.2fr);
  align-items: center;
  gap: var(--app-space-3);
  min-width: 0;
  padding: 10px 14px;
}

.contract-upload-table__head {
  min-height: 42px;
  color: var(--app-text-muted);
  background: var(--app-page-bg-soft);
  font-size: 13px;
  font-weight: 600;
}

.contract-upload-table__group + .contract-upload-table__group,
.contract-upload-table__feedback {
  border-top: 1px solid var(--app-border);
}

.contract-upload-table__title,
.contract-upload-table__file {
  min-width: 0;
}

.contract-upload-table__title,
.contract-upload-table__file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contract-upload-table__file {
  display: grid;
  gap: var(--app-space-1);
}

.contract-upload-table__file small {
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contract-upload-table__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--app-space-2);
}

.contract-upload-table__feedback {
  padding: var(--app-space-3) 14px;
  background: var(--app-page-bg-soft);
}

@media (max-width: 640px) {
  .contract-upload-table {
    width: 100%;
  }

  .contract-upload-table__head,
  .contract-upload-table__row {
    grid-template-columns: minmax(100px, 0.8fr) minmax(0, 1.2fr);
  }

  .contract-upload-table__head > :nth-child(n + 3) {
    display: none;
  }

  .contract-upload-table__status,
  .contract-upload-table__actions {
    grid-column: 1 / -1;
  }

}
</style>
