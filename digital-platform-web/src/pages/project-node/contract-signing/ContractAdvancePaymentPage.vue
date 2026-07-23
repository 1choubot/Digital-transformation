<template>
  <ContractSigningNodeLayout
    :project-id="projectId"
    :workflow="workflow"
    :node="currentNode"
    :stage="stage"
    :loading="loading"
    :error-message="errorMessage"
  >

    <GeneratedFormFileCard
          :generated-file="kickoffNoticeDownloadFile"
          :pending="isPending('download:kickoff-notice-generated-file')"
          button-text="查看项目启动通知"
          @download="downloadKickoffNoticeGeneratedFile"
        />

    <div class="contract-payment-page">
      <section class="contract-payment-section">
        <header class="contract-payment-section__header">
          <h4>项目预付款支付</h4>
          <el-tag :type="paymentStatusTagType">
            {{ contractPaymentStatusText[paymentFlow?.status] || paymentFlow?.status || '-' }}
          </el-tag>
        </header>

        <el-alert
          v-if="paymentFlow?.status === 'waiting_general_manager'"
          title="等待总经理审批预付款放行"
          type="warning"
          show-icon
          :closable="false"
        />

        <el-descriptions class="contract-payment-table" :column="2" border>
          <el-descriptions-item label="当前状态">
            {{ contractPaymentStatusText[paymentFlow?.status] || paymentFlow?.status || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ formatUser(paymentFlow?.requestedBy) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDateTime(paymentFlow?.requestedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="放行人">
            {{ formatUser(paymentFlow?.approvedBy) }}
          </el-descriptions-item>
          <el-descriptions-item label="放行时间">
            {{ formatDateTime(paymentFlow?.approvedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="contract-payment-section">
        <header class="contract-payment-section__header">
          <h4>项目启动通知</h4>
          <el-tag :type="kickoffNoticeStatusTagType">
            {{ kickoffNoticeStatusText }}
          </el-tag>
        </header>

        <el-descriptions class="contract-payment-table" :column="2" border>
          <el-descriptions-item label="文件名">
            {{ kickoffNoticeGeneratedFile?.fileName || kickoffNoticeGeneratedFile?.downloadableFileName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ kickoffNoticeGeneratedFile?.version || kickoffNoticeGeneratedFile?.downloadableVersion || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="生成时间">
            {{ formatDateTime(kickoffNoticeGeneratedFile?.generatedAt || kickoffNoticeGeneratedFile?.downloadableGeneratedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="失败原因">
            {{ kickoffNoticeGeneratedFile?.failureSummary || kickoffNoticeGeneratedFile?.failureReason || '-' }}
          </el-descriptions-item>
        </el-descriptions>

      </section>

      <section v-if="hasBusinessPaymentActions" class="contract-payment-section">
        <h4>预付款处理</h4>
        <div class="contract-payment-section__actions">
          <el-button
            v-if="currentNode?.permissions?.canCompletePayment"
            type="primary"
            :loading="isPending('payment:complete')"
            @click="completePayment"
          >
            完成支付
          </el-button>
          <el-button
            v-if="currentNode?.permissions?.canRequestGeneralManagerRelease"
            type="warning"
            plain
            :loading="isPending('payment:request-release')"
            @click="requestGeneralManagerRelease"
          >
            未完成支付，待总经理审批
          </el-button>
        </div>
      </section>

      <ApprovalActionCard
        v-if="hasPaymentApprovalActions"
        title="预付款放行审批"
        description="请选择客户实际付款状态，再确认是否允许项目继续。"
        :status-text="contractPaymentStatusText[paymentFlow?.status] || paymentFlow?.status || '待审批'"
        status-type="warning"
        :show-comment="false"
        :selection-required="true"
        :selection-complete="Boolean(paymentApprovalDecision)"
        :can-approve="true"
        :busy="paymentApprovalBusy"
        :pending-action="paymentApprovalBusy ? 'approve' : ''"
        approve-text="确认放行"
        @approve="handlePaymentReleaseApproval"
      >
        <template #selection="{ disabled }">
          <ApprovalBusinessSelection
            v-model="paymentApprovalDecision"
            label="客户付款状态"
            :options="paymentApprovalOptions"
            :disabled="disabled"
          />
        </template>
      </ApprovalActionCard>
    </div>
  </ContractSigningNodeLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import GeneratedFormFileCard from '../../../components/GeneratedFormFileCard.vue';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import ApprovalBusinessSelection from '../../../components/approval/ApprovalBusinessSelection.vue';
import ContractSigningNodeLayout from '../../../components/project-workspace/contract-signing/ContractSigningNodeLayout.vue';
import {
  contractSigningNodePageProps,
  useContractSigningNodePage
} from '../../../composables/project-stage/contract-signing/useContractSigningNodePage.js';
import {
  contractPaymentStatusText,
  formatDateTime,
  formatUser
} from '../../../composables/project-stage/contract-signing/contractSigningFormatters.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(contractSigningNodePageProps);
const {
  workflow,
  currentNode,
  paymentFlow,
  loading,
  errorMessage,
  kickoffNoticeGeneratedFile,
  isPending,
  completePayment,
  requestGeneralManagerRelease,
  approvePaymentReleaseUnpaid,
  approvePaymentReleasePaid,
  downloadKickoffNoticeGeneratedFile
} = useContractSigningNodePage(props, emit);

const paymentApprovalDecision = ref('');
const paymentApprovalOptions = computed(() => [
  currentNode.value?.permissions?.canApprovePaymentReleasePaid
    ? { label: '客户已付款', value: 'paid' }
    : null,
  currentNode.value?.permissions?.canApprovePaymentReleaseUnpaid
    ? { label: '客户未付款', value: 'unpaid' }
    : null
].filter(Boolean));

const kickoffNoticeDownloadFile = computed(() => {
  const generatedFile = kickoffNoticeGeneratedFile.value;
  if (!generatedFile) return null;

  return {
    ...generatedFile,
    canDownload: generatedFile.downloadable === true
  };
});

const hasBusinessPaymentActions = computed(() =>
  Boolean(
    currentNode.value?.permissions?.canCompletePayment ||
    currentNode.value?.permissions?.canRequestGeneralManagerRelease
  )
);

const hasPaymentApprovalActions = computed(() =>
  Boolean(
    currentNode.value?.permissions?.canApprovePaymentReleaseUnpaid ||
    currentNode.value?.permissions?.canApprovePaymentReleasePaid
  )
);

const paymentApprovalBusy = computed(() =>
  isPending('payment:approve-release-unpaid') || isPending('payment:approve-release-paid')
);

watch(
  () => [currentNode.value?.nodeKey, currentNode.value?.status, paymentFlow.value?.status],
  () => { paymentApprovalDecision.value = ''; }
);

function handlePaymentReleaseApproval() {
  if (paymentApprovalDecision.value === 'paid') {
    approvePaymentReleasePaid();
    return;
  }
  if (paymentApprovalDecision.value === 'unpaid') {
    approvePaymentReleaseUnpaid();
  }
}

const paymentStatusTagType = computed(() => ({
  completed: 'success',
  released: 'success',
  waiting_general_manager: 'warning',
  pending: 'primary',
  not_started: 'info'
})[paymentFlow.value?.status] || 'info');

const kickoffNoticeStatusText = computed(() => {
  const status = kickoffNoticeGeneratedFile.value?.status || 'not_generated';
  return {
    generated: '已生成',
    generating: '生成中',
    failed: '生成失败',
    superseded: '已更新',
    not_generated: '未生成'
  }[status] || status;
});

const kickoffNoticeStatusTagType = computed(() => {
  const status = kickoffNoticeGeneratedFile.value?.status || 'not_generated';
  return {
    generated: 'success',
    generating: 'primary',
    failed: 'danger',
    superseded: 'info',
    not_generated: 'info'
  }[status] || 'info';
});
</script>

<style scoped>
.contract-payment-page {
  display: grid;
  gap: var(--app-space-4);
  min-width: 0;
}

.contract-payment-section {
  display: grid;
  gap: var(--app-space-4);
}

.contract-payment-section h4 {
  margin: 0;
}

.contract-payment-section__header,
.contract-payment-section__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--app-space-2);
}

.contract-payment-section__header {
  justify-content: space-between;
}

.contract-payment-table {
  width: 90%;
  margin-inline: auto;
}

.contract-payment-section__actions {
  justify-content: flex-end;
  width: 90%;
  margin-inline: auto;
}

@media (max-width: 640px) {
  .contract-payment-table,
  .contract-payment-section__actions {
    width: 100%;
  }

  .contract-payment-section__actions {
    justify-content: flex-start;
  }
}
</style>
