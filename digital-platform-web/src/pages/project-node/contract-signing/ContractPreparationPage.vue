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
      section-title="技术协议 / 销售合同"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
    />

    <ApprovalActionCard
      v-for="slot in approvalSlots"
      :key="`approval:${slot.slotKey}`"
      :title="`${slot.slotName}审批处理`"
      :description="`${slot.slotName} · 请核对当前文件后选择审批操作。`"
      :status-text="contractUploadSlotStatusText[slot.status] || slot.status"
      :status-type="contractSlotStatusTagType(slot.status)"
      :comment="returnReasons[slot.slotKey] || ''"
      comment-label="审批意见 / 退回原因"
      :comment-max-length="1000"
      :can-approve="slot.permissions?.canApprove === true"
      :can-return="slot.permissions?.canReturn === true"
      :busy="isSlotApprovalBusy(slot)"
      :pending-action="slotApprovalPendingAction(slot)"
      return-text="审批退回"
      @update:comment="returnReasons[slot.slotKey] = $event"
      @approve="approvePreparationSlot(slot)"
      @return="handleApprovalReturn(slot, $event)"
    />
  </ContractSigningNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import ContractSigningNodeLayout from '../../../components/project-workspace/contract-signing/ContractSigningNodeLayout.vue';
import ContractUploadSlots from '../../../components/project-workspace/contract-signing/ContractUploadSlots.vue';
import {
  contractSlotStatusTagType,
  contractUploadSlotStatusText
} from '../../../composables/project-stage/contract-signing/contractSigningFormatters.js';
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
  approvePreparationSlot,
  returnPreparationSlot
} = useContractSigningNodePage(props, emit);

const approvalSlots = computed(() => slots.value.filter((slot) =>
  slot.permissions?.canApprove === true || slot.permissions?.canReturn === true
));

function isSlotApprovalBusy(slot) {
  return isPending(`approve:${slot.slotKey}`) || isPending(`return:${slot.slotKey}`);
}

function slotApprovalPendingAction(slot) {
  if (isPending(`approve:${slot.slotKey}`)) return 'approve';
  if (isPending(`return:${slot.slotKey}`)) return 'return';
  return '';
}

function handleApprovalReturn(slot, comment) {
  returnReasons[slot.slotKey] = comment;
  returnPreparationSlot(slot);
}
</script>
