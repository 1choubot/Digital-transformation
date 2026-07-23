<template>
  <ContractSigningNodeLayout
    :project-id="projectId"
    :workflow="workflow"
    :node="currentNode"
    :stage="stage"
    :loading="loading"
    :error-message="errorMessage"
  >
    <ContractSigningSection
      v-if="hasCustomerReturnActions"
      eyebrow="客户退回"
      title="源合同文件处理"
      tone="danger"
    >
      <div class="contract-customer-return-list">
        <ApprovalActionCard
          v-if="currentNode?.permissions?.canReturnTechnicalAgreementForCustomer"
          title="技术协议客户退回"
          description="根据客户意见将技术协议返回准备节点整改。"
          status-text="客户退回处理"
          status-type="danger"
          :comment="returnReasons.technical_agreement || ''"
          comment-label="客户退回原因"
          :comment-max-length="1000"
          :can-return="true"
          :busy="isPending('signing:return-technical-agreement')"
          :pending-action="isPending('signing:return-technical-agreement') ? 'return' : ''"
          return-text="退回技术协议"
          @update:comment="returnReasons.technical_agreement = $event"
          @return="handleTechnicalAgreementReturn"
        />

        <ApprovalActionCard
          v-if="currentNode?.permissions?.canReturnSalesContractForCustomer"
          title="销售合同客户退回"
          description="根据客户意见将销售合同返回准备节点整改。"
          status-text="客户退回处理"
          status-type="danger"
          :comment="returnReasons.sales_contract || ''"
          comment-label="客户退回原因"
          :comment-max-length="1000"
          :can-return="true"
          :busy="isPending('signing:return-sales-contract')"
          :pending-action="isPending('signing:return-sales-contract') ? 'return' : ''"
          return-text="退回销售合同"
          @update:comment="returnReasons.sales_contract = $event"
          @return="handleSalesContractReturn"
        />
      </div>
    </ContractSigningSection>

    <ContractUploadSlots
      :slots="slots"
      section-title="技术协议扫描件 / 销售合同扫描件"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
    />

    <ContractSigningSection
      v-if="currentNode?.permissions?.canCompleteSigning"
      eyebrow="节点动作"
      title="签订完成"
    >
      <template #actions>
          <el-button
            type="primary"
            :loading="isPending('signing:complete')"
            @click="completeSigning"
          >
            完成
          </el-button>
      </template>
    </ContractSigningSection>
  </ContractSigningNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import ContractSigningNodeLayout from '../../../components/project-workspace/contract-signing/ContractSigningNodeLayout.vue';
import ContractSigningSection from '../../../components/project-workspace/contract-signing/ContractSigningSection.vue';
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
  returnTechnicalAgreementForCustomer,
  returnSalesContractForCustomer,
  completeSigning
} = useContractSigningNodePage(props, emit);

const hasCustomerReturnActions = computed(() =>
  Boolean(
    currentNode.value?.permissions?.canReturnTechnicalAgreementForCustomer ||
    currentNode.value?.permissions?.canReturnSalesContractForCustomer
  )
);

function handleTechnicalAgreementReturn(comment) {
  returnReasons.technical_agreement = comment;
  returnTechnicalAgreementForCustomer();
}

function handleSalesContractReturn(comment) {
  returnReasons.sales_contract = comment;
  returnSalesContractForCustomer();
}
</script>

<style scoped>
.contract-customer-return-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-3);
  min-width: 0;
}

@media (max-width: 760px) {
  .contract-customer-return-list {
    grid-template-columns: 1fr;
  }
}
</style>
