<template>
  <section class="generated-file-card" aria-label="生成文件">
    <div class="generated-file-card__content">
      <div class="generated-file-card__heading">
        <span class="section-eyebrow">{{ heading }}</span>
        <el-tag :type="tagType">{{ statusText }}</el-tag>
      </div>
      <p>{{ normalizedFile.fileName || '当前版本生成成功后开放下载。' }}</p>
      <small v-if="normalizedFile.fileSize || normalizedFile.generatedAt">
        {{ formatFileSize(normalizedFile.fileSize) }} · {{ formatDateTime(normalizedFile.generatedAt) }}
      </small>
      <el-alert
        v-if="normalizedFile.errorMessage"
        :title="normalizedFile.errorMessage"
        type="error"
        :closable="false"
      />
    </div>
    <el-button
      v-if="normalizedFile.canDownload"
      class="form-download-button"
      type="primary"
      size="large"
      :loading="pending"
      @click="$emit('download')"
    >
      下载表单
    </el-button>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  generatedFile: {
    type: Object,
    default: null
  },
  pending: {
    type: Boolean,
    default: false
  },
  heading: {
    type: String,
    default: '生成文件'
  }
});

defineEmits(['download']);

const normalizedFile = computed(() => props.generatedFile || {
  status: 'not_started',
  fileName: null,
  fileSize: null,
  generatedAt: null,
  errorMessage: null,
  canDownload: false
});
const statusText = computed(() => ({
  not_started: '待生成',
  generating: '生成中',
  generated: '已生成',
  failed: '生成失败'
}[normalizedFile.value.status] || normalizedFile.value.status || '待生成'));
const tagType = computed(() => ({
  generated: 'success',
  failed: 'danger',
  generating: 'warning'
}[normalizedFile.value.status] || 'info'));

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('zh-CN', { hour12: false });
}

function formatFileSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value) || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
</script>
