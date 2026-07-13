<template>
    <section v-if="generatedFile" class="generated-file-card">
        <div><span class="section-eyebrow">生成文件</span><el-tag :type="tagType">{{ statusText }}</el-tag>
            <p>{{ generatedFile.fileName || '当前版本生成成功后开放下载。' }}</p><small
                v-if="generatedFile.fileSize">{{ formatFileSize(generatedFile.fileSize) }} ·
                {{ formatDateTime(generatedFile.generatedAt) }}</small><el-alert v-if="generatedFile.errorMessage"
                :title="generatedFile.errorMessage" type="error" :closable="false" />
        </div><el-button v-if="generatedFile.canDownload" :loading="pending"
            @click="$emit('download')">下载生成文件</el-button>
    </section>
</template>
<script
    setup>    import { computed } from 'vue'; import { formatFileSize, formatDateTime } from './solutionDesignFormatters.js'; const props = defineProps({ generatedFile: { type: Object, default: null }, pending: Boolean }); defineEmits(['download']); const statusText = computed(() => ({ not_started: '待生成', generating: '生成中', generated: '已生成', failed: '生成失败' }[props.generatedFile?.status] || props.generatedFile?.status || '待生成')); const tagType = computed(() => ({ generated: 'success', failed: 'danger', generating: 'warning' }[props.generatedFile?.status] || 'info'));</script>
