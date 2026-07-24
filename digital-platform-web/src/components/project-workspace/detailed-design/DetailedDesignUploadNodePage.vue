<template>
  <DetailedDesignNodeLayout
    :workflow="workflow"
    :node="currentNode"
    :loading="context.workspaceLoading"
    :error-message="context.workspaceErrorMessage"
  >
    <DetailedDesignUploadSlots
      :slots="slots"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
      @mark-no-upload="markUploadNoUpload"
      @cancel-no-upload="cancelUploadNoUpload"
    />
    <div v-if="canViewSubmit" class="detailed-upload-node-actions">
      <el-tooltip :disabled="!submitDisabledReason" :content="submitDisabledReason" placement="top">
        <span>
          <el-button
            type="primary"
            :loading="isPending(`submit:${currentNode.nodeKey}`)"
            :disabled="!canSubmitCurrentNode"
            @click="submitNode(currentNode)"
          >
            提交节点
          </el-button>
        </span>
      </el-tooltip>
    </div>
  </DetailedDesignNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
import DetailedDesignNodeLayout from './DetailedDesignNodeLayout.vue';
import DetailedDesignUploadSlots from './DetailedDesignUploadSlots.vue';
import {
  detailedDesignNodePageProps,
  useDetailedDesignNodePage
} from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(detailedDesignNodePageProps);

const {
  context,
  workflow,
  currentNode,
  slots,
  isPending,
  handleUpload,
  markUploadNoUpload,
  cancelUploadNoUpload,
  submitNode,
  downloadUpload
} = useDetailedDesignNodePage(props, emit);

const canViewSubmit = computed(() =>
  currentNode.value?.permissions?.canViewSubmit === true ||
  currentNode.value?.permissions?.canPrepareSubmit === true ||
  currentNode.value?.permissions?.canSubmit === true
);
const canSubmitCurrentNode = computed(() => currentNode.value?.permissions?.canSubmit === true);
const submitDisabledReason = computed(() => {
  if (canSubmitCurrentNode.value) {
    return '';
  }
  const reasons = currentNode.value?.permissions?.submitBlockingReasons?.length
    ? currentNode.value.permissions.submitBlockingReasons
    : currentNode.value?.blockingReasons || [];
  return reasons.join('；');
});
</script>

<style scoped>
.detailed-upload-node-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
