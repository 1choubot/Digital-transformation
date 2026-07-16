<template>
    <section class="solution-node-page" v-loading="loading"><el-alert v-if="errorMessage" :title="errorMessage"
            type="error" show-icon :closable="false" /><el-empty v-else-if="!loading && (!workflow || !node)"
            description="当前项目未返回该方案设计节点" /><template v-else-if="workflow && node">
            <section class="solution-node-card">
                <header class="solution-node-header">
                    <div>
                        <h3>{{ node.nodeName }}</h3>
                    </div>
                </header>

                <el-alert v-if="node.returnReason" :title="`退回原因：${node.returnReason}`" type="warning" show-icon
                    :closable="false" /><el-alert v-if="node.blockingReasons?.length"
                    :title="`阻塞原因：${node.blockingReasons.join('；')}`" type="warning" show-icon :closable="false" />
                <slot />
            </section>
        </template>
    </section>
</template>
<script
    setup>    import { computed } from 'vue'; import { nodeStatusText, formatDateTime } from './solutionDesignFormatters.js'; const props = defineProps({ workflow: Object, node: Object, loading: Boolean, errorMessage: String }); const tagType = computed(() => ({ approved: 'success', pending_review: 'warning', pending_general_review: 'warning', returned: 'danger', not_started: 'info', ended: 'info' }[props.node?.status] || 'primary'));</script>
