<template>
    <section v-if="slots.length" class="solution-section">
        <header><span class="section-eyebrow">上传槽</span><strong>当前文件和权限</strong></header>
        <div class="slot-list">
            <article v-for="slot in slots" :key="slot.slotKey" class="slot-card">
                <div class="slot-heading"><strong>{{ slot.slotName }}</strong>
                    <div><el-tag size="small">{{ slot.status }} · v{{ slot.revision || 1 }}</el-tag><el-tag
                            v-if="slot.confidential" size="small" type="warning">保密</el-tag></div>
                </div>
                <div v-if="slot.currentFile" class="file-meta">
                    <span>{{ slot.currentFile.originalFileName }}</span><small>v{{ slot.currentFile.revision || slot.revision || 1 }}
                        · {{ formatFileSize(slot.currentFile.fileSize) }} ·
                        {{ formatUser(slot.currentFile.uploadedByUser) }} ·
                        {{ formatDateTime(slot.currentFile.uploadedAt) }}</small></div><el-alert
                    v-else-if="slot.currentFileHidden" title="文件细节已按后端保密规则脱敏" type="info" :closable="false" /><el-empty
                    v-else description="暂无当前有效文件" :image-size="44" />
                <div class="slot-actions"><el-upload v-if="slot.permissions?.canUpload" :show-file-list="false"
                        :auto-upload="true" :http-request="options => requestUpload(slot, options)"><el-button
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
<style
    scoped>

    .solution-section,
    .slot-list,
    .slot-card,
    .file-meta {
        display: grid;
        gap: var(--space-3, 12px)
    }

    .solution-section>header,
    .slot-heading,
    .slot-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3, 12px)
    }

    .slot-card {
        padding: var(--space-3, 12px);
        border: 1px solid var(--color-border, #d8dde6);
        border-radius: var(--radius-md, 8px)
    }

    .slot-heading>div,
    .slot-actions {
        justify-content: flex-start;
        flex-wrap: wrap
    }

    .file-meta small {
        color: var(--color-text-secondary, #667789)
    }

    @media(max-width:640px) {

        .solution-section>header,
        .slot-heading {
            display: grid
        }

        .slot-actions>* {
            width: 100%
        }
    }
</style>
