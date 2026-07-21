<template>
  <SolutionDesignNodeLayout heading="估计管理费用及税费利润" :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <SolutionUploadSlots :slots="slots" :is-pending="isPending"
      @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption" />

    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :selection-required="requiresBranchSelection"
      :selection-complete="!requiresBranchSelection || Boolean(branchType)"
      :comment="returnReasons[nodeKey] || ''" @update:comment="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveFinanceNode" @return="returnNode(nodeKey)">
      <template #selection="{ disabled }">
        <div class="finance-approval-flow">
          <label class="finance-approval-flow__label" id="finance-approval-flow-title">
            <strong>后续流程</strong>
            <span>*</span>
            <small>审批通过前必须选择</small>
          </label>
          <el-radio-group v-model="branchType" class="finance-approval-flow__options"
            aria-labelledby="finance-approval-flow-title" aria-required="true" :disabled="disabled">
            <el-radio value="quotation" border>报价流程</el-radio>
            <el-radio value="tender" border>投标流程</el-radio>
          </el-radio-group>
        </div>
      </template>
    </SolutionNodeActions>
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, ref } from 'vue';
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const branchType = ref('');
const {
  context, workflow, nodeKey, currentNode, slots, returnReasons, isPending,
  handleUpload, downloadUpload, markUploadExemption, cancelUploadExemption,
  submitNode, approveNode, returnNode
} = useSolutionDesignNodePage(props, emit);

const requiresBranchSelection = computed(() => (
  currentNode.value?.status === 'pending_general_review' &&
  currentNode.value?.permissions?.canApprove === true
));

async function approveFinanceNode(comment) {
  const payload = requiresBranchSelection.value
    ? { branchType: branchType.value, comment }
    : { comment };
  if (requiresBranchSelection.value && !payload.branchType) return;
  await approveNode(nodeKey.value, payload);
}
</script>

<style scoped>
.finance-approval-flow {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.finance-approval-flow__label {
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.finance-approval-flow__label > span {
  color: var(--el-color-danger);
}

.finance-approval-flow__label small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}

.finance-approval-flow__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.finance-approval-flow__options :deep(.el-radio.is-bordered) {
  width: 100%;
  height: auto;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
}

.finance-approval-flow__options :deep(.el-radio__label) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.finance-approval-flow__options :deep(.el-radio:hover:not(.is-disabled)),
.finance-approval-flow__options :deep(.el-radio.is-checked:not(.is-disabled)) {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.finance-approval-flow__options :deep(.el-radio.is-checked:not(.is-disabled)) {
  background: var(--el-color-primary-light-9);
}

@media (max-width: 640px) {
  .finance-approval-flow__options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
