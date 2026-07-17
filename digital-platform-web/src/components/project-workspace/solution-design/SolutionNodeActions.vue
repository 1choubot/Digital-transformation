<template>
  <section v-if="showModule" class="solution-actions">
    <article v-if="hasApprovalAction" class="solution-action-card approval-review-card">
      <header class="solution-action-card__heading approval-review-card__heading">
        <div>
          <strong>{{ node.nodeName || '审批处理' }}</strong>
          <small>请选择处理决定，再确认提交审批结果。</small>
        </div>
        <el-tag :type="resultTagType">{{ resultStatusText }}</el-tag>
      </header>

      <div class="solution-approval-decision approval-review-card__decision">
        <div class="solution-approval-field-label approval-review-card__field-label">
          <strong>审批决定</strong><span>*</span>
        </div>
        <el-radio-group v-model="decision" class="approval-review-card__options" :disabled="busy"
          @change="handleDecisionChange">
          <el-radio v-if="node.permissions?.canApprove"
            class="approval-review-card__option approval-review-card__option--approve"
            value="approve" border>
            审批通过
          </el-radio>
          <el-radio v-if="node.permissions?.canReturn"
            class="approval-review-card__option approval-review-card__option--return"
            value="return" border>
            退回修改
          </el-radio>
        </el-radio-group>
      </div>

      <div v-if="approveRequiresConfirmation && decision === 'approve'"
        class="solution-approval-form approval-review-card__form">
        <slot name="approve-form" :busy="busy" />
        <div class="solution-action-card__footer approval-review-card__footer">
          <el-button type="primary" :loading="isPending(`approve:${node.nodeKey}`)"
            :disabled="busy || approveDisabled" @click="confirmApprove">
            确认审批通过
          </el-button>
        </div>
      </div>

      <div v-if="decision === 'return'" class="solution-approval-form approval-review-card__form">
        <p class="solution-approval-form__notice approval-review-card__notice">退回后当前节点资料需要按原因修改并重新提交审批。</p>
        <label class="solution-approval-field-label approval-review-card__field-label">
          <strong>退回原因</strong><span>*</span>
        </label>
        <el-input :model-value="returnReason" type="textarea" :rows="3"
          placeholder="请明确填写退回原因和修改要求" :disabled="busy"
          @update:model-value="$emit('update:returnReason', $event)" />
        <div class="solution-action-card__footer approval-review-card__footer">
          <el-button type="warning" plain :loading="isPending(`return:${node.nodeKey}`)"
            :disabled="busy || !normalizedReturnReason" @click="confirmReturn">
            确认退回修改
          </el-button>
        </div>
      </div>
    </article>

    <div v-if="canShowSubmit" class="solution-node-submit-action">
      <el-button type="primary" size="large" :loading="isPending(`submit:${node.nodeKey}`)"
        :disabled="busy || submitDisabled" @click="$emit('submit')">
        提交节点
      </el-button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';

const props = defineProps({
  node: { type: Object, required: true },
  isPending: { type: Function, required: true },
  returnReason: { type: String, default: '' },
  submitDisabled: Boolean,
  approveDisabled: Boolean,
  approveRequiresConfirmation: Boolean,
  hideSubmit: Boolean,
  hideWhenEmpty: Boolean
});
const emit = defineEmits(['submit', 'approve', 'return', 'update:returnReason']);
const decision = ref('');
const hasApprovalAction = computed(() => props.node.permissions?.canApprove === true
  || props.node.permissions?.canReturn === true);
const canShowSubmit = computed(() => props.node.permissions?.canSubmit === true && !props.hideSubmit);
const hasVisibleContent = computed(() => canShowSubmit.value || hasApprovalAction.value);
const showModule = computed(() => hasVisibleContent.value || !props.hideWhenEmpty);
const busy = computed(() => props.isPending(`submit:${props.node.nodeKey}`)
  || props.isPending(`approve:${props.node.nodeKey}`)
  || props.isPending(`return:${props.node.nodeKey}`));
const normalizedReturnReason = computed(() => String(props.returnReason || '').trim());
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
    decision.value = '';
    if (previousValue) emit('update:returnReason', '');
  }
);

function confirmApprove() {
  if (props.approveDisabled || busy.value) return;
  emit('approve');
}

function handleDecisionChange(nextDecision) {
  if (nextDecision !== 'approve' || props.approveRequiresConfirmation) return;
  if (props.approveDisabled || busy.value) {
    decision.value = '';
    return;
  }
  // 普通审批选择“通过”后立即提交；只有需要补充业务选择的节点才展开确认表单。
  decision.value = '';
  emit('approve');
}

async function confirmReturn() {
  if (!normalizedReturnReason.value || busy.value) return;
  try {
    await ElMessageBox.confirm(`确认退回“${props.node.nodeName || '当前节点'}”并要求修改吗？`, '退回修改', {
      type: 'warning', confirmButtonText: '确认退回', cancelButtonText: '取消'
    });
    emit('return');
  } catch {
    // 用户取消时不请求、不刷新。
  }
}
</script>

<style scoped>
.solution-actions,
.solution-action-card,
.solution-approval-decision,
.solution-approval-form {
  display: grid;
  gap: 12px;
}

.solution-action-card {
  padding: 14px;
}

.solution-action-card__heading > div,
.solution-approval-field-label {
  display: flex;
  gap: 6px;
}

.solution-action-card__heading > div {
  flex-direction: column;
}

.solution-action-card__heading small {
  color: #667789;
}

.solution-node-submit-action {
  display: flex;
  justify-content: flex-end;
}

.solution-approval-field-label span {
  color: var(--el-color-danger);
}

</style>
