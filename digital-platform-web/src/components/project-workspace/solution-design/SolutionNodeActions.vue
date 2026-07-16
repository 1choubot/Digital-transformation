<template>
  <section v-if="showModule" class="solution-actions">
    <article v-if="node.permissions?.canSubmit" class="solution-action-card">
      <header class="solution-action-card__heading">
        <div>
          <strong>节点提交</strong>
          <small>完成当前节点资料后提交，进入后续审批。</small>
        </div>
        <el-tag type="info">待提交</el-tag>
      </header>
      <div class="solution-action-card__footer">
        <el-button type="primary" :loading="isPending(`submit:${node.nodeKey}`)"
          :disabled="busy || submitDisabled" @click="$emit('submit')">
          提交节点
        </el-button>
      </div>
    </article>

    <article v-if="hasApprovalAction" class="solution-action-card">
      <header class="solution-action-card__heading">
        <div>
          <strong>审批处理</strong>
          <small>审批通过将直接执行；退回修改需要填写原因。</small>
        </div>
        <el-tag :type="resultTagType">{{ resultStatusText }}</el-tag>
      </header>

      <div class="solution-approval-decision">
        <div class="solution-approval-field-label">
          <strong>审批决定</strong><span>*</span>
        </div>
        <div class="solution-approval-decision__options">
          <el-button v-if="node.permissions?.canApprove" type="primary"
            :loading="isPending(`approve:${node.nodeKey}`)" :disabled="busy || approveDisabled"
            @click="approveDirectly">
            审批通过
          </el-button>
          <el-button v-if="node.permissions?.canReturn" type="warning" plain
            :disabled="busy" @click="decision = 'return'">
            退回修改
          </el-button>
        </div>
      </div>

      <div v-if="decision === 'return'" class="solution-approval-form">
        <p class="solution-approval-form__notice">退回后当前节点资料需要按原因修改并重新提交审批。</p>
        <label class="solution-approval-field-label">
          <strong>退回原因</strong><span>*</span>
        </label>
        <el-input :model-value="returnReason" type="textarea" :rows="3"
          placeholder="请明确填写退回原因和修改要求" :disabled="busy"
          @update:model-value="$emit('update:returnReason', $event)" />
        <div class="solution-action-card__footer">
          <el-button type="warning" plain :loading="isPending(`return:${node.nodeKey}`)"
            :disabled="busy || !normalizedReturnReason" @click="confirmReturn">
            确认退回修改
          </el-button>
        </div>
      </div>
    </article>

    <article v-else-if="showReadOnlyResult" class="solution-action-card solution-approval-result"
      aria-label="方案设计审批结果">
      <header class="solution-action-card__heading">
        <div><strong>审批结果</strong><small>当前审批状态（只读）</small></div>
        <el-tag :type="resultTagType">{{ resultStatusText }}</el-tag>
      </header>
      <p v-if="node.returnReason">退回原因：{{ node.returnReason }}</p>
      <small v-if="resultTime">处理时间：{{ formatDateTime(resultTime) }}</small>
    </article>
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
  approveDisabled: Boolean
});
const emit = defineEmits(['submit', 'approve', 'return', 'update:returnReason']);
const decision = ref('');
const hasApprovalAction = computed(() => props.node.permissions?.canApprove === true
  || props.node.permissions?.canReturn === true);
const approvalResultStatuses = new Set([
  'pending_review', 'pending_general_review', 'approved', 'returned', 'ended', 'skipped'
]);
const showReadOnlyResult = computed(() => approvalResultStatuses.has(props.node.status));
const showModule = computed(() => props.node.permissions?.canSubmit === true
  || hasApprovalAction.value
  || showReadOnlyResult.value);
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
const resultTime = computed(() => props.node.approvedAt || props.node.returnedAt || props.node.submittedAt || null);

watch(
  () => [props.node.nodeKey, props.node.currentRevision, props.node.status],
  (nextValue, previousValue) => {
    decision.value = '';
    if (previousValue) emit('update:returnReason', '');
  }
);

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
}

function approveDirectly() {
  if (props.approveDisabled || busy.value) return;
  // 审批通过无需展开表单或二次确认；收起可能已打开的退回表单后直接请求。
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
  border: 1px solid #e3ebf3;
  border-radius: 8px;
  background: #fff;
}

.solution-action-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.solution-action-card__heading > div,
.solution-approval-field-label {
  display: flex;
  gap: 6px;
}

.solution-action-card__heading > div {
  flex-direction: column;
}

.solution-action-card__heading small,
.solution-approval-result > small {
  color: #667789;
}

.solution-approval-field-label span {
  color: var(--el-color-danger);
}

.solution-approval-decision__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.solution-approval-decision__options .el-button {
  width: 100%;
  height: auto;
  min-height: 40px;
  margin: 0;
}

.solution-approval-form {
  padding: 12px;
  border: 1px solid #e3ebf3;
  border-radius: 8px;
  background: #fbfcfe;
}

.solution-approval-form__notice,
.solution-approval-result p {
  margin: 0;
  color: #526579;
}

.solution-action-card__footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .solution-action-card__heading,
  .solution-action-card__footer {
    display: grid;
  }

  .solution-approval-decision__options {
    grid-template-columns: minmax(0, 1fr);
  }

  .solution-action-card__footer .el-button {
    width: 100%;
  }
}
</style>
