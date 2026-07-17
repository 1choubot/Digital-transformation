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
      mode="signing"
      section-eyebrow="签订协议和合同"
      section-title="技术协议扫描件 / 销售合同扫描件"
      :return-reasons="returnReasons"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
      @confirm-signing="confirmSigningResult"
      @update-return-reason="(slotKey, value) => { returnReasons[slotKey] = value; }"
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
  returnReasons,
  isPending,
  handleUpload,
  downloadUpload,
  confirmSigningResult
} = useContractSigningNodePage(props, emit);
</script>
