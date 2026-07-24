<template>
  <DetailedDesignNodeLayout
    :workflow="workflow"
    :node="currentNode"
    :loading="context.workspaceLoading"
    :error-message="context.workspaceErrorMessage"
  >
    <template #title-after>
      <GeneratedFormFileCard
        :generated-file="activeDto?.form?.generatedFile"
        :pending="isPending(`review:${nodeKey}:download`)"
        :button-text="downloadButtonText"
        @download="downloadReviewGeneratedFile(nodeKey, activeDto?.form?.generatedFile)"
      />
    </template>

    <section v-if="canViewFormContent" ref="reviewFormRoot" class="detailed-review-section">
      <DetailedDesignReviewFormTable
        :model="reviewFormData"
        :invalid-field-keys="invalidFieldKeys"
        :disabled="!canSaveReviewForm"
        @update-field="updateReviewFormField"
        @update-repeatable="updateRepeatableItem"
        @update-plan-item="updateImplementationPlanItem"
        @add-repeatable="addRepeatableItem"
        @remove-repeatable="removeRepeatableItem"
      />
      <div class="detailed-review-actions">
        <el-button
          size="large"
          :disabled="!canSaveReviewForm"
          :loading="isPending(`review:${nodeKey}:save`)"
          @click="saveReviewForm(nodeKey)"
        >
          保存草稿
        </el-button>
        <el-button
          size="large"
          type="primary"
          :disabled="!canSubmitReviewForm"
          :loading="isPending(`review:${nodeKey}:submit`)"
          @click="handleSubmitReviewForm"
        >
          提交表单
        </el-button>
      </div>
    </section>

    <ApprovalActionCard
      v-if="currentNode && hasApprovalAction"
      title="审批处理"
      :description="`${currentNode.nodeName || '当前节点'} · 请填写意见后选择审批操作。`"
      :status-text="approvalStatusText"
      :status-type="approvalStatusType"
      :comment="returnReasons[nodeKey] || ''"
      :comment-max-length="1000"
      :can-approve="canApproveCurrentReview"
      :can-return="canReturnCurrentReview"
      :busy="approvalBusy"
      :pending-action="pendingApprovalAction"
      @update:comment="returnReasons[nodeKey] = $event"
      @approve="approveNode(nodeKey, { comment: $event })"
      @return="confirmReturn"
    />
  </DetailedDesignNodeLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ApprovalActionCard from '../../approval/ApprovalActionCard.vue';
import GeneratedFormFileCard from '../../GeneratedFormFileCard.vue';
import DetailedDesignNodeLayout from './DetailedDesignNodeLayout.vue';
import DetailedDesignReviewFormTable from './DetailedDesignReviewFormTable.vue';
import {
  canRenderDetailedDesignReviewApproveButton,
  canRenderDetailedDesignReviewContent,
  canRenderDetailedDesignReviewReturnButton,
  canRenderDetailedDesignReviewSaveButton,
  canRenderDetailedDesignReviewSubmitButton,
  hasDetailedDesignReviewApprovalActions
} from './detailedDesignPermissionViewHelpers.js';
import {
  detailedDesignNodePageProps,
  useDetailedDesignNodePage
} from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';
import {
  getDetailedDesignReviewMissingRequiredFields,
  useDetailedDesignReviewForm
} from '../../../composables/project-stage/detailed-design/useDetailedDesignReviewForm.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(detailedDesignNodePageProps);
const base = useDetailedDesignNodePage(props, emit);
const {
  context,
  workflow,
  nodeKey,
  currentNode,
  localError,
  returnReasons,
  isPending,
  runAction,
  approveNode,
  returnNode,
  downloadReviewGeneratedFile
} = base;
const review = useDetailedDesignReviewForm({
  projectId: computed(() => props.projectId),
  authToken: computed(() => props.authToken),
  selectedNodeKey: nodeKey,
  defaultRecorderName: computed(() => props.currentUser?.name || props.currentUser?.account || ''),
  runAction,
  localError
});
const {
  reviewFormData,
  syncFromWorkflow,
  loadReviewForm,
  invalidateRequests,
  updateReviewFormField,
  updateRepeatableItem,
  updateImplementationPlanItem,
  addRepeatableItem,
  removeRepeatableItem,
  saveReviewForm,
  submitReviewForm
} = review;
const activeDto = computed(() => review.activeReviewFormDto(workflow.value, currentNode.value));
const isCustomerReview = computed(() => nodeKey.value === 'customer_design_review');
const downloadButtonText = computed(() => isCustomerReview.value
  ? '查看客户设计评审记录表'
  : '查看内部设计评审记录表'
);
const canViewFormContent = computed(() => canRenderDetailedDesignReviewContent(activeDto.value));
const canSaveReviewForm = computed(() => canRenderDetailedDesignReviewSaveButton(activeDto.value));
const canSubmitReviewForm = computed(() => canRenderDetailedDesignReviewSubmitButton(activeDto.value));
const reviewFormRoot = ref(null);
const validationAttempted = ref(false);
const missingRequiredFields = computed(() => getDetailedDesignReviewMissingRequiredFields(reviewFormData));
const invalidFieldKeys = computed(() => validationAttempted.value
  ? missingRequiredFields.value.map((field) => field.key)
  : []
);
const hasApprovalAction = computed(() => hasDetailedDesignReviewApprovalActions(currentNode.value));
const canApproveCurrentReview = computed(() => canRenderDetailedDesignReviewApproveButton(currentNode.value));
const canReturnCurrentReview = computed(() => canRenderDetailedDesignReviewReturnButton(currentNode.value));
const approvalBusy = computed(() =>
  isPending(`approve:${nodeKey.value}`) || isPending(`return:${nodeKey.value}`)
);
const pendingApprovalAction = computed(() => {
  if (isPending(`approve:${nodeKey.value}`)) return 'approve';
  if (isPending(`return:${nodeKey.value}`)) return 'return';
  return '';
});
const approvalStatusText = computed(() => ({
  approved: '审批已通过',
  returned: '审批已退回',
  pending_review: '待研发中心负责人审批'
}[currentNode.value?.status] || currentNode.value?.status || '审批结果'));
const approvalStatusType = computed(() => ({
  approved: 'success',
  returned: 'danger',
  pending_review: 'warning'
}[currentNode.value?.status] || 'info'));

watch(workflow, (value) => {
  syncFromWorkflow(value, nodeKey.value);
  void loadReviewForm(nodeKey.value);
}, { immediate: true });

watch(nodeKey, () => {
  validationAttempted.value = false;
});

onBeforeUnmount(invalidateRequests);

async function handleSubmitReviewForm() {
  validationAttempted.value = true;
  if (missingRequiredFields.value.length === 0) {
    try {
      await ElMessageBox.confirm(
        '提交后将生成设计评审记录表，并在生成成功后进入研发中心负责人审批。确认提交？',
        '提交确认',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消'
        }
      );
      await submitReviewForm(nodeKey.value);
    } catch {
      // 用户取消时不请求后端。
    }
    return;
  }

  const missingLabels = missingRequiredFields.value.map((field) => field.label);
  ElMessage.warning(`请补充以下必填内容：${missingLabels.join('、')}`);
  await nextTick();
  const firstKey = missingRequiredFields.value[0]?.key;
  const firstField = firstKey ? reviewFormRoot.value?.querySelector(`[data-field-key="${firstKey}"]`) : null;
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}

async function confirmReturn(comment) {
  if (!comment || approvalBusy.value) return;
  try {
    await ElMessageBox.confirm(
      `确认退回“${currentNode.value?.nodeName || '当前节点'}”并回到详细设计重新执行吗？`,
      '退回修改',
      {
        type: 'warning',
        confirmButtonText: '确认退回',
        cancelButtonText: '取消'
      }
    );
    await returnNode(nodeKey.value);
  } catch {
    // 用户取消时不请求后端。
  }
}
</script>

<style scoped>
.detailed-review-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.detailed-review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
</style>
