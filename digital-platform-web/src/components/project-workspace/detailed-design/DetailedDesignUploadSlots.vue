<template>
  <section v-if="slots.length" class="detailed-upload-list" role="table" aria-label="详细设计上传列表">
    <div class="detailed-upload-list__head" role="row">
      <span role="columnheader">上传内容</span>
      <span role="columnheader">当前文件</span>
      <span role="columnheader">操作</span>
    </div>

    <div v-for="slot in slots" :key="slot.slotKey" class="detailed-upload-list__row" role="row">
      <strong class="detailed-upload-list__title" role="cell" :title="slot.slotName">{{ slot.slotName }}</strong>
      <span class="detailed-upload-list__filename" role="cell" :title="displayFileName(slot)">
        {{ displayFileName(slot) }}
      </span>
      <div class="detailed-upload-list__actions" role="cell">
        <el-upload
          v-if="canRenderDetailedDesignUploadButton(slot)"
          :show-file-list="false"
          :auto-upload="true"
          :http-request="(options) => requestUpload(slot, options)"
        >
          <el-button type="primary" :loading="isPending(`upload:${slot.slotKey}`)">上传/替换</el-button>
        </el-upload>
        <el-button
          v-if="canRenderDetailedDesignUploadDownloadButton(slot)"
          type="primary"
          plain
          :loading="isPending(`download:${slot.slotKey}`)"
          @click="$emit('download', slot)"
        >
          下载
        </el-button>
        <el-button
          v-if="slot.permissions?.canMarkNoUpload"
          plain
          :loading="isPending(`no-upload:${slot.slotKey}`)"
          @click="$emit('mark-no-upload', slot)"
        >
          无需上传
        </el-button>
        <el-button
          v-if="slot.permissions?.canCancelNoUpload"
          plain
          type="warning"
          :loading="isPending(`cancel-no-upload:${slot.slotKey}`)"
          @click="$emit('cancel-no-upload', slot)"
        >
          取消无需上传
        </el-button>
      </div>
    </div>
  </section>
</template>

<script setup>
import {
  canRenderDetailedDesignUploadButton,
  canRenderDetailedDesignUploadDownloadButton
} from './detailedDesignPermissionViewHelpers.js';

const emit = defineEmits(['upload', 'download', 'mark-no-upload', 'cancel-no-upload']);

defineProps({
  slots: { type: Array, default: () => [] },
  isPending: { type: Function, required: true }
});

function requestUpload(slot, options) {
  emit('upload', slot, { target: { files: [options.file], value: '' } });
  options.onSuccess?.({});
  return Promise.resolve({ slot, file: options.file });
}

function displayFileName(slot) {
  if (slot.isUploadExempted) {
    return '无需上传';
  }
  return slot.currentFile?.originalFileName || '-';
}
</script>

<style scoped>
.detailed-upload-list {
  display: grid;
  gap: 0;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow-x: auto;
}

.detailed-upload-list__head,
.detailed-upload-list__row {
  display: grid;
  grid-template-columns:
    minmax(150px, 1.2fr)
    minmax(180px, 1.4fr)
    minmax(150px, auto);
  align-items: center;
  min-width: 560px;
}

.detailed-upload-list__head {
  min-height: 40px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 500;
  background: var(--el-fill-color-light);
}

.detailed-upload-list__row {
  min-height: 56px;
  border-top: 1px solid var(--el-border-color);
}

.detailed-upload-list__head > span,
.detailed-upload-list__row > span,
.detailed-upload-list__title,
.detailed-upload-list__actions {
  min-width: 0;
  padding: 8px 10px;
}

.detailed-upload-list__title,
.detailed-upload-list__filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detailed-upload-list__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
