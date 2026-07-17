<template>
  <ContractSigningNodeLayout
    :project-id="projectId"
    :workflow="workflow"
    :node="currentNode"
    :stage="stage"
    :loading="loading"
    :error-message="errorMessage"
  >
    <ContractUploadSlots
      :slots="slots"
      mode="upload"
      section-eyebrow="项目启动通知"
      section-title="上传项目启动通知"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
    />
  </ContractSigningNodeLayout>
</template>

<script setup>
import ContractSigningNodeLayout from '../../../components/project-workspace/contract-signing/ContractSigningNodeLayout.vue';
import ContractUploadSlots from '../../../components/project-workspace/contract-signing/ContractUploadSlots.vue';
import {
  contractSigningNodePageProps,
  useContractSigningNodePage
} from '../../../composables/project-stage/contract-signing/useContractSigningNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(contractSigningNodePageProps);
const {
  workflow,
  currentNode,
  slots,
  loading,
  errorMessage,
  isPending,
  handleUpload,
  downloadUpload
} = useContractSigningNodePage(props, emit);
</script>
