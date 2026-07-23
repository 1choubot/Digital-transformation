<template>
  <ContractSigningNodeLayout
    :project-id="projectId"
    :workflow="workflow"
    :node="currentNode"
    :stage="stage"
    :loading="loading"
    :error-message="errorMessage"
  >
    <section class="solution-section">
      <header>
        <div>
          <span class="section-eyebrow">预付款状态</span>
          <strong>项目预付款支付</strong>
        </div>
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

      <el-descriptions :column="2" border>
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

      <section class="solution-subsection">
        <header>
          <div>
            <span class="section-eyebrow">生成文件</span>
            <strong>项目启动通知</strong>
          </div>
          <el-tag :type="kickoffNoticeStatusTagType">
            {{ kickoffNoticeStatusText }}
          </el-tag>
        </header>

        <el-descriptions :column="2" border>
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

        <div v-if="kickoffNoticeGeneratedFile?.downloadable" class="solution-actions">
          <div class="action-row">
            <el-button
              type="primary"
              plain
              :loading="isPending('download:kickoff-notice-generated-file')"
              @click="downloadKickoffNoticeGeneratedFile"
            >
              下载项目启动通知
            </el-button>
          </div>
        </div>
      </section>

      <div v-if="hasPaymentActions" class="solution-actions">
        <header>
          <span class="section-eyebrow">节点动作</span>
          <strong>预付款处理</strong>
        </header>
        <div class="action-row">
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
          <el-button
            v-if="currentNode?.permissions?.canApprovePaymentReleaseUnpaid"
            type="primary"
            :loading="isPending('payment:approve-release-unpaid')"
            @click="approvePaymentReleaseUnpaid"
          >
            未付款并通过
          </el-button>
          <el-button
            v-if="currentNode?.permissions?.canApprovePaymentReleasePaid"
            type="success"
            :loading="isPending('payment:approve-release-paid')"
            @click="approvePaymentReleasePaid"
          >
            已付款通过
          </el-button>
        </div>
      </div>
    </section>
  </ContractSigningNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
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

const hasPaymentActions = computed(() =>
  Boolean(
    currentNode.value?.permissions?.canCompletePayment ||
    currentNode.value?.permissions?.canRequestGeneralManagerRelease ||
    currentNode.value?.permissions?.canApprovePaymentReleaseUnpaid ||
    currentNode.value?.permissions?.canApprovePaymentReleasePaid
  )
);

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
