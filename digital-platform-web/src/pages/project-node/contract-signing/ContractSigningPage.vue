<template>
  <ContractSigningNodeLayout
    :project-id="projectId"
    :workflow="workflow"
    :node="currentNode"
    :stage="stage"
    :loading="loading"
    :error-message="errorMessage"
  >
    <section v-if="hasCustomerReturnActions" class="solution-section">
      <header>
        <div>
          <span class="section-eyebrow">客户退回</span>
          <strong>源合同文件处理</strong>
        </div>
      </header>

      <div class="slot-list">
        <article
          v-if="currentNode?.permissions?.canReturnTechnicalAgreementForCustomer"
          class="slot-card"
        >
          <div class="slot-heading">
            <strong>技术协议</strong>
          </div>
          <div class="return-box">
            <el-input
              :model-value="returnReasons.technical_agreement || ''"
              type="textarea"
              :rows="3"
              placeholder="客户退回原因 *"
              @update:model-value="value => { returnReasons.technical_agreement = value; }"
            />
            <el-button
              type="danger"
              plain
              :loading="isPending('signing:return-technical-agreement')"
              @click="returnTechnicalAgreementForCustomer"
            >
              退回技术协议
            </el-button>
          </div>
        </article>

        <article
          v-if="currentNode?.permissions?.canReturnSalesContractForCustomer"
          class="slot-card"
        >
          <div class="slot-heading">
            <strong>销售合同</strong>
          </div>
          <div class="return-box">
            <el-input
              :model-value="returnReasons.sales_contract || ''"
              type="textarea"
              :rows="3"
              placeholder="客户退回原因 *"
              @update:model-value="value => { returnReasons.sales_contract = value; }"
            />
            <el-button
              type="danger"
              plain
              :loading="isPending('signing:return-sales-contract')"
              @click="returnSalesContractForCustomer"
            >
              退回销售合同
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <ContractUploadSlots
      :slots="slots"
      mode="signing"
      section-eyebrow="签订协议和合同"
      section-title="技术协议扫描件 / 销售合同扫描件"
      :return-reasons="returnReasons"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
    />

    <section v-if="currentNode?.permissions?.canCompleteSigning" class="solution-section">
      <header>
        <div>
          <span class="section-eyebrow">节点动作</span>
          <strong>签订完成</strong>
        </div>
      </header>
      <div class="solution-actions">
        <div class="action-row">
          <el-button
            type="primary"
            :loading="isPending('signing:complete')"
            @click="completeSigning"
          >
            完成
          </el-button>
        </div>
      </div>
    </section>
  </ContractSigningNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
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
</script>
