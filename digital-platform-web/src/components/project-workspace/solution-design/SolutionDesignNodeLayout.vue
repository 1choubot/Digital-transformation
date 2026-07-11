<template>
    <section class="solution-node-page" v-loading="loading"><el-alert v-if="errorMessage" :title="errorMessage"
            type="error" show-icon :closable="false" /><el-empty v-else-if="!loading && (!workflow || !node)"
            description="当前项目未返回该方案设计节点" /><template v-else-if="workflow && node"><el-alert v-if="message"
                :title="message" type="success" show-icon :closable="false" /><el-alert v-if="localError"
                :title="localError" type="error" show-icon :closable="false" />
            <section class="solution-node-card">
                <header class="solution-node-header">
                    <div><span class="section-eyebrow">方案设计阶段</span>
                        <h3>{{ node.nodeName }}</h3>
                    </div><el-tag :type="tagType">{{ nodeStatusText[node.status] || node.status }}</el-tag>
                </header>
                <dl class="stage-document-meta">
                    <div>
                        <dt>当前版本</dt>
                        <dd>v{{ node.currentRevision || 1 }}</dd>
                    </div>
                    <div>
                        <dt>激活时间</dt>
                        <dd>{{ formatDateTime(node.activatedAt) }}</dd>
                    </div>
                    <div>
                        <dt>提交时间</dt>
                        <dd>{{ formatDateTime(node.submittedAt) }}</dd>
                    </div>
                    <div>
                        <dt>通过时间</dt>
                        <dd>{{ formatDateTime(node.approvedAt) }}</dd>
                    </div>
                </dl><el-alert v-if="node.returnReason" :title="`退回原因：${node.returnReason}`" type="warning" show-icon
                    :closable="false" /><el-alert v-if="node.blockingReasons?.length"
                    :title="`阻塞原因：${node.blockingReasons.join('；')}`" type="warning" show-icon :closable="false" />
                <slot />
            </section>
        </template>
    </section>
</template>
<script
    setup>    import { computed } from 'vue'; import { nodeStatusText, formatDateTime } from './solutionDesignFormatters.js'; const props = defineProps({ workflow: Object, node: Object, loading: Boolean, errorMessage: String, message: String, localError: String }); const tagType = computed(() => ({ approved: 'success', pending_review: 'warning', pending_general_review: 'warning', returned: 'danger', not_started: 'info', ended: 'info' }[props.node?.status] || 'primary'));</script>
<style
    scoped>
    .solution-node-page {
        min-height: 180px;
        display: grid;
        gap: var(--space-4, 16px)
    }

    .solution-node-card {
        display: grid;
        gap: var(--space-4, 16px)
    }

    .solution-node-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3, 12px)
    }

    .solution-node-header h3 {
        margin: 0
    }

    @media(max-width:640px) {
        .solution-node-header {
            display: grid
        }
    }
</style>
