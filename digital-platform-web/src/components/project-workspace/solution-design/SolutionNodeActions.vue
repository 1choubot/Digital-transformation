<template>
    <section class="solution-actions">
        <header><span class="section-eyebrow">节点动作</span><strong>提交、审批和退回</strong></header>
        <div class="action-row"><el-button v-if="node.permissions?.canSubmit" type="primary"
                :loading="isPending(`submit:${node.nodeKey}`)" :disabled="submitDisabled"
                @click="$emit('submit')">提交节点</el-button><el-button v-if="node.permissions?.canApprove" type="primary"
                :loading="isPending(`approve:${node.nodeKey}`)" @click="$emit('approve')">审批通过</el-button></div>
        <div v-if="node.permissions?.canReturn" class="return-box"><el-input :model-value="returnReason" type="textarea"
                :rows="3" placeholder="退回原因 *" @update:model-value="$emit('update:returnReason', $event)" /><el-button
                type="warning" plain :loading="isPending(`return:${node.nodeKey}`)"
                @click="confirmReturn">审批退回</el-button></div>
        <div v-if="showReadOnlyResult && !hasAction" class="solution-approval-result">
            <el-tag :type="resultTagType">{{ resultStatusText }}</el-tag>
            <p v-if="node.returnReason">退回原因：{{ node.returnReason }}</p>
            <small v-if="resultTime">处理时间：{{ formatDateTime(resultTime) }}</small>
        </div>
    </section>
</template>
<script
    setup>
import { computed } from 'vue';
import { ElMessageBox } from 'element-plus';

const props = defineProps({
    node: { type: Object, required: true },
    isPending: { type: Function, required: true },
    returnReason: { type: String, default: '' },
    submitDisabled: Boolean,
    showReadOnlyResult: Boolean
});
const emit = defineEmits(['submit', 'approve', 'return', 'update:returnReason']);
const hasAction = computed(() => props.node.permissions?.canSubmit === true
    || props.node.permissions?.canApprove === true
    || props.node.permissions?.canReturn === true);
const resultStatusText = computed(() => ({
    approved: '审批已通过',
    returned: '审批已退回',
    ended: '项目已结束',
    skipped: '节点已跳过',
    pending_review: '待审批',
    pending_general_review: '待总经理审批'
}[props.node.status] || props.node.status || '审批结果'));
const resultTagType = computed(() => ({
    approved: 'success',
    returned: 'danger',
    ended: 'info',
    pending_review: 'warning',
    pending_general_review: 'warning'
}[props.node.status] || 'info'));
const resultTime = computed(() => props.node.approvedAt || props.node.returnedAt || props.node.submittedAt || null);

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
}

async function confirmReturn() {
    try {
        await ElMessageBox.confirm(`确认退回“${props.node.nodeName || '当前节点'}”吗？`, '退回确认', {
            type: 'warning',
            confirmButtonText: '确认退回',
            cancelButtonText: '取消'
        });
        emit('return');
    } catch {
        // 用户取消时不请求、不刷新。
    }
}
</script>
