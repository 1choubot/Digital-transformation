<template>
    <section v-if="generatedFile?.canDownload" class="generated-file-card">
        <el-button type="primary" size="large" :loading="pending"
            @click="$emit('download')">{{ buttonText }}</el-button>
    </section>
</template>
<script setup>
defineProps({
    generatedFile: { type: Object, default: null },
    pending: Boolean,
    buttonText: { type: String, default: '查看报价单' }
});
defineEmits(['download']);
</script>
