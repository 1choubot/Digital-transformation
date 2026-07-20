<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
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
</script>
