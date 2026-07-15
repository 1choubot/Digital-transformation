<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <SolutionUploadSlots :slots="slots" :is-pending="isPending" :exemption-reasons="exemptionReasons"
      @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption"
      @update-exemption-reason="({ slotKey, value }) => exemptionReasons[slotKey] = value" />
    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
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
  context, workflow, nodeKey, currentNode, slots, returnReasons, exemptionReasons,
  isPending, handleUpload, downloadUpload, markUploadExemption,
  cancelUploadExemption, submitNode, approveNode, returnNode
} = useSolutionDesignNodePage(props, emit);
</script>
