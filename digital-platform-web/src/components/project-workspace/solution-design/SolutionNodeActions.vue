<template>
    <section class="solution-actions">
        <header><span class="section-eyebrow">节点动作</span><strong>提交、审批和退回</strong></header>
        <div class="action-row"><el-button v-if="node.permissions?.canSubmit" type="primary"
                :loading="isPending(`submit:${node.nodeKey}`)" :disabled="submitDisabled"
                @click="$emit('submit')">提交节点</el-button><el-button v-if="node.permissions?.canApprove" type="primary"
                :loading="isPending(`approve:${node.nodeKey}`)" @click="$emit('approve')">审批通过</el-button></div>
        <div v-if="node.permissions?.canReturn" class="return-box"><el-input :model-value="returnReason" type="textarea"
                :rows="3" placeholder="退回原因 *" @update:model-value="$emit('update:returnReason', $event)" /><el-button
                type="danger" plain :loading="isPending(`return:${node.nodeKey}`)"
                @click="confirmReturn">审批退回</el-button></div><el-empty
            v-if="!node.permissions?.canSubmit && !node.permissions?.canApprove && !node.permissions?.canReturn"
            description="当前账号在该节点没有可执行动作" :image-size="48" />
    </section>
</template>
<script
    setup>    import { ElMessageBox } from 'element-plus'; const props = defineProps({ node: { type: Object, required: true }, isPending: { type: Function, required: true }, returnReason: { type: String, default: '' }, submitDisabled: Boolean }); const emit = defineEmits(['submit', 'approve', 'return', 'update:returnReason']); async function confirmReturn() { try { await ElMessageBox.confirm(`确认退回“${props.node.nodeName || '当前节点'}”吗？`, '退回确认', { type: 'warning', confirmButtonText: '确认退回', cancelButtonText: '取消' }); emit('return') } catch {/* 用户取消时不请求、不刷新 */ } }</script>
<style
    scoped>

    .solution-actions,
    .return-box {
        display: grid;
        gap: var(--space-3, 12px)
    }

    .solution-actions>header,
    .action-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3, 12px)
    }

    .action-row {
        justify-content: flex-start;
        flex-wrap: wrap
    }

    @media(max-width:640px) {
        .solution-actions>header {
            display: grid
        }

        .action-row>* {
            width: 100%
        }
    }
</style>
