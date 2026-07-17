<template>
  <section v-if="slots.length" class="solution-section">
    <header>
      <div>
        <span class="section-eyebrow">{{ sectionEyebrow }}</span>
        <strong>{{ sectionTitle }}</strong>
      </div>
    </header>

    <div class="slot-list">
      <article v-for="slot in slots" :key="slot.slotKey" class="slot-card">
        <div class="slot-heading">
          <strong>{{ slot.slotName }}</strong>
          <div>
            <el-tag size="small" :type="contractSlotStatusTagType(slot.status)">
              {{ contractUploadSlotStatusText[slot.status] || slot.status }} · v{{ slot.revision || 1 }}
            </el-tag>
          </div>
        </div>

        <div v-if="slot.currentFile" class="file-meta">
          <span>{{ slot.currentFile.originalFileName }}</span>
          <small>
            v{{ slot.currentFile.revision || slot.revision || 1 }} ·
            {{ formatFileSize(slot.currentFile.fileSize) }} ·
            {{ formatUser(slot.currentFile.uploadedByUser) }} ·
            {{ formatDateTime(slot.currentFile.uploadedAt) }}
          </small>
        </div>
        <el-empty v-else description="暂无当前有效文件" :image-size="44" />

        <el-alert
          v-if="slot.returnReason"
          :title="`退回原因：${slot.returnReason}`"
          type="warning"
          show-icon
          :closable="false"
        />

        <div class="slot-actions">
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
            :loading="isPending(`download:${slot.slotKey}`)"
            @click="$emit('download', slot)"
          >
            下载
          </el-button>
        </div>

        <div v-if="mode === 'preparation' && (slot.permissions?.canApprove || slot.permissions?.canReturn)" class="solution-actions">
          <header>
            <span class="section-eyebrow">准备线动作</span>
            <strong>{{ slot.slotName }}审批</strong>
          </header>
          <div class="action-row">
            <el-button
              v-if="slot.permissions?.canApprove"
              type="primary"
              :loading="isPending(`approve:${slot.slotKey}`)"
              @click="$emit('approve', slot)"
            >
              审批通过
            </el-button>
          </div>
          <div v-if="slot.permissions?.canReturn" class="return-box">
            <el-input
              :model-value="returnReasons[slot.slotKey] || ''"
              type="textarea"
              :rows="3"
              placeholder="退回原因 *"
              @update:model-value="$emit('update-return-reason', slot.slotKey, $event)"
            />
            <el-button
              type="danger"
              plain
              :loading="isPending(`return:${slot.slotKey}`)"
              @click="$emit('return', slot)"
            >
              审批退回
            </el-button>
          </div>
        </div>

        <div v-if="mode === 'signing' && slot.permissions?.canConfirmSigningResult" class="solution-actions">
          <header>
            <span class="section-eyebrow">签署确认</span>
            <strong>确认线下签署结果</strong>
          </header>
          <div class="action-row">
            <el-button
              type="primary"
              :loading="isPending(`signing:${slot.slotKey}:approved`)"
              @click="$emit('confirm-signing', slot, 'approved')"
            >
              确认通过
            </el-button>
          </div>
          <div class="return-box">
            <el-input
              :model-value="returnReasons[slot.slotKey] || ''"
              type="textarea"
              :rows="3"
              placeholder="不通过原因 *"
              @update:model-value="$emit('update-return-reason', slot.slotKey, $event)"
            />
            <el-button
              type="danger"
              plain
              :loading="isPending(`signing:${slot.slotKey}:returned`)"
              @click="$emit('confirm-signing', slot, 'returned')"
            >
              确认不通过
            </el-button>
          </div>
        </div>
      </article>
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
  'download',
  'approve',
  'return',
  'confirm-signing',
  'update-return-reason'
]);

defineProps({
  slots: { type: Array, default: () => [] },
  mode: { type: String, default: 'upload' },
  sectionEyebrow: { type: String, default: '文件槽' },
  sectionTitle: { type: String, default: '上传文件' },
  returnReasons: { type: Object, default: () => ({}) },
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
</script>
