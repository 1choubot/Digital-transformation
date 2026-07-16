<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <SolutionUploadSlots :slots="slots" :is-pending="isPending" @upload="handleUpload" @download="downloadUpload" />

    <section v-if="requiresBranchSelection" class="solution-section">
      <h4>审批通过后流程</h4>
      <el-alert title="总经理通过财务成本估算时，必须同时确定后续进入报价流程或投标流程。"
        type="info" show-icon :closable="false" />
      <el-radio-group v-model="branchType" :disabled="isPending(`approve:${nodeKey}`)">
        <el-radio-button value="quotation">报价流程</el-radio-button>
        <el-radio-button value="tender">投标流程</el-radio-button>
      </el-radio-group>
    </section>

    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :approve-disabled="requiresBranchSelection && !branchType"
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveFinanceNode" @return="returnNode(nodeKey)" />
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
  handleUpload, downloadUpload, submitNode, approveNode, returnNode
} = useSolutionDesignNodePage(props, emit);

const requiresBranchSelection = computed(() => (
  currentNode.value?.status === 'pending_general_review' &&
  currentNode.value?.permissions?.canApprove === true
));

async function approveFinanceNode() {
  const payload = requiresBranchSelection.value ? { branchType: branchType.value } : {};
  if (requiresBranchSelection.value && !payload.branchType) return;
  await approveNode(nodeKey.value, payload);
}
</script>
