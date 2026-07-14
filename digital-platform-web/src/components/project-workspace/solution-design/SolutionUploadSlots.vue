<template>
    <section v-if="slots.length" class="solution-section">
        <div class="slot-list">
            <article v-for="slot in slots" :key="slot.slotKey" class="slot-card">
                <div class="slot-heading"><strong>{{ slot.slotName }}</strong>
                    <div><el-tag size="small">{{ slot.status }} · v{{ slot.revision || 1 }}</el-tag><el-tag
                            v-if="slot.confidential" size="small" type="warning">保密</el-tag></div>
                </div>
                <div v-if="slot.currentFile" class="file-meta">
                    <span>{{ slot.currentFile.originalFileName }}</span><small>v{{ slot.currentFile.revision ||
                        slot.revision || 1 }}
                        · {{ formatFileSize(slot.currentFile.fileSize) }} ·
                        {{ formatUser(slot.currentFile.uploadedByUser) }} ·
                        {{ formatDateTime(slot.currentFile.uploadedAt) }}</small>
                </div><el-alert v-else-if="slot.currentFileHidden" title="文件细节已按后端保密规则脱敏" type="info"
                    :closable="false" /><el-empty v-else description="暂无当前有效文件" :image-size="44" />
                <div class="slot-actions"><el-upload v-if="slot.permissions?.canUpload" :show-file-list="false"
                        :auto-upload="true" :http-request="options => requestUpload(slot, options)"><el-button
                            type="primary"
                            :loading="isPending(`upload:${slot.slotKey}`)">上传/替换</el-button></el-upload><el-button
                        v-if="slot.currentFile && slot.permissions?.canDownload"
                        :loading="isPending(`download:${slot.slotKey}`)"
                        @click="$emit('download', slot)">下载</el-button><span
                        v-if="!slot.permissions?.canUpload && !slot.permissions?.canDownload"
                        class="inline-muted">当前无文件操作权限</span></div>
            </article>
        </div>
    </section>
</template>
<script
    setup>    import { formatFileSize, formatUser, formatDateTime } from './solutionDesignFormatters.js'; const emit = defineEmits(['upload', 'download']); defineProps({ slots: { type: Array, default: () => [] }, isPending: { type: Function, required: true } }); function requestUpload(slot, options) { emit('upload', slot, { target: { files: [options.file], value: '' } }); return Promise.resolve() }</script>
