<template>
  <section v-if="slots.length" class="solution-section">
    <div class="solution-upload-list" role="table" aria-label="方案设计上传列表">
      <div class="solution-upload-list__head" role="row">
        <span role="columnheader">上传内容</span>
        <span role="columnheader">文件名</span>
        <span role="columnheader">操作</span>
      </div>

      <div v-for="slot in slots" :key="slot.slotKey" class="solution-upload-list__row" role="row">
        <strong class="solution-upload-list__title" role="cell" :title="slot.slotName">{{ slot.slotName }}</strong>
        <span class="solution-upload-list__filename" role="cell" :title="displayFileName(slot)">
          {{ displayFileName(slot) }}
        </span>
        <div class="slot-actions" role="cell">
          <el-upload v-if="slot.permissions?.canUpload" :show-file-list="false" :auto-upload="true"
            :http-request="options => requestUpload(slot, options)">
            <el-button type="primary" :loading="isPending(`upload:${slot.slotKey}`)">上传/替换</el-button>
          </el-upload>
          <el-button v-if="slot.permissions?.canMarkExemption" plain
            :loading="isPending(`exemption:mark:${slot.slotKey}`)"
            @click="$emit('mark-exemption', slot)">无需上传</el-button>
          <el-button v-else-if="slot.permissions?.canCancelExemption" type="warning" plain
            :loading="isPending(`exemption:cancel:${slot.slotKey}`)"
            @click="$emit('cancel-exemption', slot)">取消无需上传</el-button>
          <el-button v-if="slot.currentFile && slot.permissions?.canDownload" type="primary"
            :loading="isPending(`download:${slot.slotKey}`)" @click="$emit('download', slot)">下载</el-button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const emit = defineEmits(['upload', 'download', 'mark-exemption', 'cancel-exemption']);
defineProps({
  slots: { type: Array, default: () => [] },
  isPending: { type: Function, required: true }
});

function requestUpload(slot, options) {
  // Keep the native event shape expected by the shared workflow composable.
  emit('upload', slot, { target: { files: [options.file], value: '' } });
  options.onSuccess?.({});
  return Promise.resolve({ slot, file: options.file });
}

function displayFileName(slot) {
  if (slot.currentFile) {
    return slot.currentFile.originalFileName || '-';
  }

  return slot.currentFileHidden ? '文件信息已隐藏' : '-';
}
</script>
