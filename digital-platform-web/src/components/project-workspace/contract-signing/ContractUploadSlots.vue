<template>
  <section v-if="slots.length" class="contract-upload-section">
    <h4>{{ sectionTitle }}</h4>
    <div class="contract-upload-table" role="table" :aria-label="sectionTitle">
      <div class="contract-upload-table__head" role="row">
        <span role="columnheader">上传内容</span>
        <span role="columnheader">文件名</span>
        <span role="columnheader">操作</span>
      </div>

      <div v-for="slot in slots" :key="slot.slotKey" class="contract-upload-table__row" role="row">
        <strong class="contract-upload-table__title" role="cell" :title="slot.slotName">
          {{ slot.slotName }}
        </strong>
        <span class="contract-upload-table__filename" role="cell" :title="displayFileName(slot)">
          {{ displayFileName(slot) }}
        </span>
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
            :loading="isPending(`download:${slot.slotKey}`)"
            @click="$emit('download', slot)"
          >
            下载
          </el-button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const emit = defineEmits([
  'upload',
  'download'
]);

defineProps({
  slots: { type: Array, default: () => [] },
  sectionTitle: { type: String, default: '上传文件' },
  isPending: { type: Function, required: true }
});

function requestUpload(slot, options) {
  emit('upload', slot, { target: { files: [options.file], value: '' } });
  options.onSuccess?.({});
  return Promise.resolve({ slot, file: options.file });
}

function displayFileName(slot) {
  return slot.currentFile?.originalFileName || '-';
}

function uploadButtonText(slot) {
  return slot.status === 'returned' ? '整改重传' : '上传/替换';
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
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--color-border, var(--app-border));
  border-radius: var(--radius-md, var(--app-radius-md));
  background: var(--el-bg-color, var(--app-surface));
}

.contract-upload-table__head,
.contract-upload-table__row {
  display: grid;
  grid-template-columns: 200px minmax(260px, 1fr) 264px;
  align-items: center;
  gap: var(--space-3, 12px);
  min-height: 52px;
  padding: 8px 14px;
}

.contract-upload-table__head {
  min-height: 42px;
  color: var(--color-text-secondary, var(--app-text-muted));
  background: var(--app-page-bg-soft);
  border-bottom: 1px solid var(--color-border, var(--app-border));
  font-weight: 600;
}

.contract-upload-table__row + .contract-upload-table__row {
  border-top: 1px solid var(--color-border, var(--app-border));
}

.contract-upload-table__title,
.contract-upload-table__filename {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contract-upload-table__filename {
  color: var(--color-text-secondary, var(--app-text-muted));
}

.contract-upload-table__actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: var(--space-3, 12px);
}

@media (max-width: 640px) {
  .contract-upload-table {
    width: 100%;
  }

  .contract-upload-table__head,
  .contract-upload-table__row {
    grid-template-columns: minmax(100px, 0.8fr) minmax(0, 1.2fr);
  }

  .contract-upload-table__head > [role="columnheader"]:last-child {
    display: none;
  }

  .contract-upload-table__actions {
    grid-column: 1 / -1;
  }

  .contract-upload-table__actions > * {
    width: auto;
  }
}
</style>
