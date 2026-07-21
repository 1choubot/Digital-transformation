<template>
  <SolutionDesignNodeLayout class="solution-quotation-node-page" :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage" :heading="pageHeading">
    <template #title-after>
      <GeneratedFormFileCard v-if="flow?.branchType === 'quotation' && quotation.dto.value?.form?.generatedFile"
        button-text="查看报价单"
        :generated-file="quotation.dto.value.form.generatedFile"
        :pending="quotation.pendingAction.value === 'download'" @download="quotation.download" />
    </template>

    <el-alert v-if="workflow?.permissions?.canAdvanceToContract" title="方案设计已完成，可以进入合同签订阶段"
      type="success" show-icon :closable="false" />

    <SolutionUploadSlots v-if="flow?.branchType === 'tender'" :slots="tenderSlots"
      :is-pending="isPending"
      @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption" />

    <section v-if="flow" class="quotation-section">
      <div class="action-row">
        <el-button v-if="flow.permissions?.canSelectBranch" type="primary" :loading="isPending('branch:quotation')"
          @click="selectBranch('quotation')">选择报价流程</el-button>
        <el-button v-if="flow.permissions?.canSelectBranch" :loading="isPending('branch:tender')"
          @click="selectBranch('tender')">选择投标流程</el-button>
        <el-button v-if="flow.permissions?.canSubmitQuotation" type="primary" :loading="isPending('quotation:submit')"
          @click="submitQuotation">提交报价单</el-button>
      </div>
    </section>

    <SolutionQuotationForm v-if="flow?.branchType === 'quotation'" :dto="quotation.dto.value"
      :show-form-content="canViewFormContent"
      :form-data="quotation.formData" :loading="quotation.loading.value"
      :pending-action="quotation.pendingAction.value" :error-message="quotation.errorMessage.value"
      @save="quotation.save" @submit="quotation.submit"
      @add-item="quotation.addItem" @remove-item="quotation.removeItem" />

    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :comment="returnReasons[nodeKey] || ''" @update:comment="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey, { comment: $event })"
      @return="returnNode(nodeKey)" />

    <ApprovalActionCard v-if="showQuotationResultActions" title="报价结果处理"
      description="记录客户对当前报价的处理结果。退回研发成本或结束项目时必须填写原因。"
      status-text="等待客户确认" status-type="warning" :comment="quotationResultComment"
      comment-label="处理意见/退回或结束原因" comment-placeholder="客户接受报价时选填；退回研发成本或结束项目时请填写原因"
      :can-approve="flow.permissions?.canAcceptQuotation === true"
      :can-return="flow.permissions?.canRejectQuotationToRdCost === true"
      :can-end="flow.permissions?.canRejectQuotationAndEndProject === true"
      :busy="quotationResultBusy" :pending-action="quotationResultPendingAction"
      approve-text="客户接受报价" return-text="退回研发成本" end-text="结束项目"
      @update:comment="quotationResultComment = $event" @approve="processQuotationAcceptance"
      @return="processQuotationRejection('return_to_rd_cost', $event)"
      @end="processQuotationRejection('end_project', $event)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import SolutionQuotationForm from '../../../components/project-workspace/solution-design/SolutionQuotationForm.vue';
import GeneratedFormFileCard from '../../../components/GeneratedFormFileCard.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionQuotationForm } from '../../../composables/project-stage/solution-design/useSolutionQuotationForm.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const page = useSolutionDesignNodePage(props, emit);
const {
  context, workflow, nodeKey, currentNode, slots, returnReasons,
  isPending, handleUpload, downloadUpload, markUploadExemption, cancelUploadExemption, submitNode, approveNode,
  returnNode, selectBranch, submitQuotation, acceptQuotation, rejectQuotation
} = page;
const flow = computed(() => workflow.value?.quotationTender || null);
const pageHeading = computed(() => {
  if (flow.value?.branchType === 'quotation') return '填写报价单';
  if (flow.value?.branchType === 'tender') return '编写标书';
  return '';
});
const quotationResultComment = ref('');
const showQuotationResultActions = computed(() => Boolean(flow.value && (
  flow.value.permissions?.canAcceptQuotation
  || flow.value.permissions?.canRejectQuotationAndEndProject
  || flow.value.permissions?.canRejectQuotationToRdCost
)));
const quotationResultPendingAction = computed(() => {
  if (isPending('quotation:accept')) return 'approve';
  if (isPending('quotation:reject:return_to_rd_cost')) return 'return';
  if (isPending('quotation:reject:end_project')) return 'end';
  return '';
});
const quotationResultBusy = computed(() => Boolean(quotationResultPendingAction.value));
const tenderSlotKeys = new Set(['tender_business_file', 'tender_technical_file']);
const tenderSlots = computed(() => slots.value.filter((slot) => tenderSlotKeys.has(slot.slotKey)));
const canViewFormContent = computed(() => quotation.dto.value?.permissions?.canEdit === true);
const quotation = useSolutionQuotationForm({
  projectId: computed(() => props.projectId),
  authToken: computed(() => props.authToken),
  notifyChanged: page.notifyChanged
});

watch(() => flow.value?.branchType, (branchType) => {
  if (branchType === 'quotation') quotation.load();
}, { immediate: true });

async function processQuotationAcceptance() {
  const result = await acceptQuotation();
  if (result) quotationResultComment.value = '';
}

async function processQuotationRejection(action, reason) {
  const result = await rejectQuotation(action, reason);
  if (result) quotationResultComment.value = '';
}
</script>
