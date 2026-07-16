<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <el-alert v-if="workflow?.permissions?.canAdvanceToContract" title="方案设计已完成，可以进入合同签订阶段"
      type="success" show-icon :closable="false" />

    <SolutionUploadSlots :slots="slots" :is-pending="isPending" @upload="handleUpload" @download="downloadUpload" />

    <section v-if="flow" class="quotation-section">
      <div class="slot-heading"><h4>报价/投标</h4><el-tag>{{ flow.branchStatus || '待选择' }}</el-tag></div>
      <div class="action-row">
        <el-button v-if="flow.permissions?.canSelectBranch" type="primary" :loading="isPending('branch:quotation')"
          @click="selectBranch('quotation')">选择报价流程</el-button>
        <el-button v-if="flow.permissions?.canSelectBranch" :loading="isPending('branch:tender')"
          @click="selectBranch('tender')">选择投标流程</el-button>
        <el-button v-if="flow.permissions?.canSubmitQuotation" type="primary" :loading="isPending('quotation:submit')"
          @click="submitQuotation">提交报价单</el-button>
        <el-button v-if="flow.permissions?.canSubmitTender" type="primary"
          :loading="isPending('submit:quotation_or_tender')" @click="submitNode(nodeKey)">提交投标审批</el-button>
        <el-button v-if="flow.permissions?.canAcceptQuotation" type="success" :loading="isPending('quotation:accept')"
          @click="acceptQuotation">客户接受报价</el-button>
      </div>
    </section>

    <SolutionQuotationForm v-if="flow?.branchType === 'quotation'"
      :dto="quotation.dto.value" :show-form-content="canViewFormContent"
      :show-generated-file="true"
      :form-data="quotation.formData" :loading="quotation.loading.value"
      :pending-action="quotation.pendingAction.value" :error-message="quotation.errorMessage.value"
      @save="quotation.save" @submit="quotation.submit" @download="quotation.download"
      @add-item="quotation.addItem" @remove-item="quotation.removeItem" />

    <el-form v-if="flow?.permissions?.canRejectQuotationToRdCost || flow?.permissions?.canRejectQuotationAndEndProject"
      label-position="top">
      <el-form-item label="客户不接受原因"><el-input v-model="quotationReturnReason" type="textarea" :rows="3" /></el-form-item>
      <el-form-item label="处理方式"><el-select v-model="quotationRejectAction"><el-option label="退回研发成本估算"
        value="return_to_rd_cost" /><el-option label="结束项目" value="end_project" /></el-select></el-form-item>
      <el-button :type="quotationRejectAction === 'end_project' ? 'danger' : 'warning'" plain
        :loading="isPending(`quotation:reject:${quotationRejectAction}`)"
        @click="rejectQuotation">客户不接受并处理</el-button>
    </el-form>

    <SolutionNodeActions v-if="showNodeActions" :node="currentNode" :is-pending="isPending"
      :show-read-only-result="canReviewForm"
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, watch } from 'vue';
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import SolutionQuotationForm from '../../../components/project-workspace/solution-design/SolutionQuotationForm.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionQuotationForm } from '../../../composables/project-stage/solution-design/useSolutionQuotationForm.js';
import { isSolutionDesignFormFiller, isSolutionDesignFormReviewer } from '../../../utils/onlineFormVisibility.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const page = useSolutionDesignNodePage(props, emit);
const {
  context, workflow, nodeKey, currentNode, slots, returnReasons, quotationReturnReason,
  quotationRejectAction, isPending, handleUpload, downloadUpload, submitNode, approveNode,
  returnNode, selectBranch, submitQuotation, acceptQuotation, rejectQuotation
} = page;
const flow = computed(() => workflow.value?.quotationTender || null);
const quotation = useSolutionQuotationForm({
  projectId: computed(() => props.projectId),
  authToken: computed(() => props.authToken),
  notifyChanged: page.notifyChanged
});
const canViewFormContent = computed(() => isSolutionDesignFormFiller(workflow.value, 'business_owner', props.currentUser));
const canReviewForm = computed(() => isSolutionDesignFormReviewer(nodeKey.value, props.currentUser));
const showNodeActions = computed(() => Boolean(currentNode.value) && (
  currentNode.value?.permissions?.canSubmit === true
  || currentNode.value?.permissions?.canApprove === true
  || currentNode.value?.permissions?.canReturn === true
  || canReviewForm.value
));

watch(() => flow.value?.branchType, (branchType) => {
  if (branchType === 'quotation') quotation.load();
}, { immediate: true });
</script>
