<template>
  <section v-if="slots.length" class="solution-section">
    <div class="slot-list">
      <article v-for="slot in slots" :key="slot.slotKey" class="slot-card">
        <div class="slot-heading">
          <strong>{{ slot.slotName }}</strong>
          <div>
            <el-tag size="small">{{ slot.status }} · v{{ slot.revision || 1 }}</el-tag>
            <el-tag v-if="slot.confidential" size="small" type="warning">保密</el-tag>
            <el-tag v-if="slot.exemption?.isExempted" size="small" type="success">无需上传</el-tag>
          </div>
        </div>

        <div v-if="slot.currentFile" class="file-meta">
          <span>{{ slot.currentFile.originalFileName }}</span>
          <small>v{{ slot.currentFile.revision || slot.revision || 1 }} · {{ formatFileSize(slot.currentFile.fileSize) }} ·
            {{ formatUser(slot.currentFile.uploadedByUser) }} · {{ formatDateTime(slot.currentFile.uploadedAt) }}</small>
        </div>
        <el-alert v-else-if="slot.currentFileHidden" title="文件细节已按后端保密规则脱敏" type="info" :closable="false" />
        <div v-else-if="slot.exemption?.isExempted" class="file-meta">
          <span>{{ slot.exemption.reason || '未填写原因' }}</span>
          <small>{{ formatUser(slot.exemption.exemptedByUser) }} · {{ formatDateTime(slot.exemption.exemptedAt) }}</small>
        </div>
        <el-empty v-else description="暂无当前有效文件" :image-size="44" />

        <div class="slot-actions">
          <el-upload v-if="slot.permissions?.canUpload" :show-file-list="false" :auto-upload="true"
            :http-request="options => requestUpload(slot, options)">
            <el-button type="primary" :loading="isPending(`upload:${slot.slotKey}`)">上传/替换</el-button>
          </el-upload>
          <el-button v-if="slot.currentFile && slot.permissions?.canDownload"
            :loading="isPending(`download:${slot.slotKey}`)" @click="$emit('download', slot)">下载</el-button>
          <span v-if="!slot.permissions?.canUpload && !slot.permissions?.canDownload" class="inline-muted">当前无文件操作权限</span>
        </div>

        <div v-if="slot.permissions?.canMarkExemption" class="slot-exemption">
          <el-input :model-value="exemptionReasons[slot.slotKey] || ''" type="textarea" :rows="2"
            maxlength="1000" show-word-limit placeholder="请填写无需上传原因"
            @update:model-value="value => $emit('update-exemption-reason', { slotKey: slot.slotKey, value })" />
          <el-button plain :loading="isPending(`exemption:mark:${slot.slotKey}`)"
            @click="$emit('mark-exemption', slot)">无需上传</el-button>
        </div>
        <el-button v-if="slot.permissions?.canCancelExemption" type="warning" plain
          :loading="isPending(`exemption:cancel:${slot.slotKey}`)"
          @click="$emit('cancel-exemption', slot)">取消无需上传</el-button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { formatFileSize, formatUser, formatDateTime } from './solutionDesignFormatters.js';

const emit = defineEmits(['upload', 'download', 'mark-exemption', 'cancel-exemption', 'update-exemption-reason']);
defineProps({
  slots: { type: Array, default: () => [] },
  isPending: { type: Function, required: true },
  exemptionReasons: { type: Object, default: () => ({}) }
});

function requestUpload(slot, options) {
  // Keep the native event shape expected by the shared workflow composable.
  emit('upload', slot, { target: { files: [options.file], value: '' } });
  options.onSuccess?.({});
  return Promise.resolve({ slot, file: options.file });
}
</script>
