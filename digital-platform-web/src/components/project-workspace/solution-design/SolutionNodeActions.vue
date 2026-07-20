<template>
  <section v-if="showModule" class="solution-actions">
    <ApprovalActionCard
      v-if="hasApprovalAction"
      title="审批处理"
      :description="`${node.nodeName || '当前节点'} · 请填写意见后选择审批操作。`"
      :status-text="resultStatusText"
      :status-type="resultTagType"
      :comment="comment"
      :comment-max-length="1000"
      :selection-required="selectionRequired"
      :selection-complete="selectionComplete"
      :can-approve="node.permissions?.canApprove === true"
      :can-return="node.permissions?.canReturn === true"
      :busy="busy"
      :pending-action="pendingAction"
      :approve-disabled="approveDisabled"
      @update:comment="$emit('update:comment', $event)"
      @approve="$emit('approve', $event)"
      @return="$emit('return', $event)"
    >
      <template v-if="selectionRequired" #selection="{ disabled }">
        <slot name="selection" :disabled="disabled" />
      </template>
    </ApprovalActionCard>

    <div v-if="canShowSubmit" class="solution-node-submit-action">
      <el-button type="primary" size="large" :loading="isPending(`submit:${node.nodeKey}`)"
        :disabled="busy || submitDisabled" @click="$emit('submit')">
        完成
      </el-button>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue';
import ApprovalActionCard from '../../approval/ApprovalActionCard.vue';

const props = defineProps({
  node: { type: Object, required: true },
  isPending: { type: Function, required: true },
  comment: { type: String, default: '' },
  submitDisabled: Boolean,
  approveDisabled: Boolean,
  selectionRequired: Boolean,
  selectionComplete: { type: Boolean, default: true },
  hideSubmit: Boolean,
  hideWhenEmpty: Boolean
});
const emit = defineEmits(['submit', 'approve', 'return', 'update:comment']);
const hasApprovalAction = computed(() => props.node.permissions?.canApprove === true
  || props.node.permissions?.canReturn === true);
const canShowSubmit = computed(() => props.node.permissions?.canSubmit === true && !props.hideSubmit);
const hasVisibleContent = computed(() => canShowSubmit.value || hasApprovalAction.value);
const showModule = computed(() => hasVisibleContent.value || !props.hideWhenEmpty);
const busy = computed(() => props.isPending(`submit:${props.node.nodeKey}`)
  || props.isPending(`approve:${props.node.nodeKey}`)
  || props.isPending(`return:${props.node.nodeKey}`));
const pendingAction = computed(() => {
  if (props.isPending(`approve:${props.node.nodeKey}`)) return 'approve';
  if (props.isPending(`return:${props.node.nodeKey}`)) return 'return';
  return '';
});
const resultStatusText = computed(() => ({
  approved: '审批已通过', returned: '审批已退回', ended: '项目已结束', skipped: '节点已跳过',
  pending_review: '待审批', pending_general_review: '待总经理审批'
}[props.node.status] || props.node.status || '审批结果'));
const resultTagType = computed(() => ({
  approved: 'success', returned: 'danger', ended: 'info', skipped: 'info',
  pending_review: 'warning', pending_general_review: 'warning'
}[props.node.status] || 'info'));

watch(
  () => [props.node.nodeKey, props.node.currentRevision, props.node.status],
  (nextValue, previousValue) => {
    if (previousValue) emit('update:comment', '');
  }
);

</script>

<style scoped>
.solution-actions {
  display: grid;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.solution-node-submit-action {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
}

</style>
