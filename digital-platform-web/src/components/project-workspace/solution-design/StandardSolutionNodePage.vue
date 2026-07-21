<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage" :heading="pageHeading">
    <SolutionUploadSlots :slots="slots" :is-pending="isPending"
      @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption" />
    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :comment="returnReasons[nodeKey] || ''" @update:comment="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey, { comment: $event })"
      @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
import SolutionDesignNodeLayout from './SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from './SolutionUploadSlots.vue';
import SolutionNodeActions from './SolutionNodeActions.vue';
import {
  solutionDesignNodePageProps,
  useSolutionDesignNodePage
} from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const {
  context, workflow, nodeKey, currentNode, slots, returnReasons,
  isPending, handleUpload, downloadUpload, markUploadExemption,
  cancelUploadExemption, submitNode, approveNode, returnNode
} = useSolutionDesignNodePage(props, emit);

const headingsByNodeKey = Object.freeze({
  solution_design: '上传产出文件',
  rd_cost_estimation: '估算物料明细和研发费用',
  manufacturing_cost_estimation: '估算物料价格和安装调试运输费用',
  marketing_cost_estimation: '估算销售费用'
});

const pageHeading = computed(() => headingsByNodeKey[nodeKey.value] || '');
</script>
