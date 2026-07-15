<template>
  <section v-if="normalizedFile.canDownload" class="generated-file-card" aria-label="生成文件">
    <el-button
      class="form-download-button"
      type="primary"
      size="large"
      :loading="pending"
      @click="$emit('download')"
    >
      {{ buttonText }}
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
  buttonText: {
    type: String,
    default: '查看表单'
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
</script>
