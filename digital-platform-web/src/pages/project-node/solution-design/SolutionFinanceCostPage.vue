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
        <ApprovalBusinessSelection
          v-model="branchType"
          label="后续流程"
          :options="branchOptions"
          :disabled="disabled"
        />
      </template>
    </SolutionNodeActions>
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, ref } from 'vue';
import ApprovalBusinessSelection from '../../../components/approval/ApprovalBusinessSelection.vue';
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const branchType = ref('');
const branchOptions = [
  { label: '报价流程', value: 'quotation' },
  { label: '投标流程', value: 'tender' }
];
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
