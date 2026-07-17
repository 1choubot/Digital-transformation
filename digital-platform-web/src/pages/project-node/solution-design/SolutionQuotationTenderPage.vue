<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
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
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />

    <div v-if="flow && (flow.permissions?.canAcceptQuotation
      || flow.permissions?.canRejectQuotationAndEndProject
      || flow.permissions?.canRejectQuotationToRdCost)" class="action-row quotation-page-bottom-actions">
      <el-button v-if="flow.permissions?.canAcceptQuotation" size="large" type="success"
        :loading="isPending('quotation:accept')" @click="acceptQuotation">客户接受报价</el-button>
      <el-button v-if="flow.permissions?.canRejectQuotationAndEndProject" size="large" type="danger" plain
        :loading="isPending('quotation:reject:end_project')" @click="rejectQuotation('end_project')">结束项目</el-button>
      <el-button v-if="flow.permissions?.canRejectQuotationToRdCost" size="large" type="warning" plain
        :loading="isPending('quotation:reject:return_to_rd_cost')"
        @click="rejectQuotation('return_to_rd_cost')">审批不通过</el-button>
    </div>
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, watch } from 'vue';
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
</script>
