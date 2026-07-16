<template>
  <GeneratedFormFileCard :generated-file="activeDto?.form?.generatedFile"
    :pending="isPending(`review:${nodeKey}:download`)" @download="downloadReviewGeneratedFile(nodeKey)" />
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <section v-if="canViewFormContent" ref="reviewFormRoot" class="review-section">

      <SolutionReviewFormTable
        :model="reviewFormData"
        :repeatable-field-configs="tableRepeatableFieldConfigs"
        :implementation-plan-items="implementationPlanItems"
        :invalid-field-keys="invalidFieldKeys"
        :invalid-plan-keys="invalidPlanKeys"
        :disabled="!activeDto?.permissions?.canEditReviewForm"
        @update-field="updateReviewFormField"
        @update-repeatable="updateRepeatableItem"
        @add-repeatable="addRepeatableItem"
        @remove-repeatable="removeRepeatableItem"
        @update-plan="updateImplementationPlanItem"
      />
      <div class="action-row node-online-form-actions">
        <el-button size="large" :disabled="!activeDto?.permissions?.canEditReviewForm" :loading="isPending(`review:${nodeKey}:save`)"
          @click="saveReviewForm(nodeKey)">
          保存草稿
        </el-button>
        <el-button size="large" type="primary" :disabled="!activeDto?.permissions?.canSubmitReviewForm"
          :loading="isPending(`review:${nodeKey}:submit`)" @click="handleSubmitReviewForm">
          提交表单
        </el-button>
      </div>
    </section>
    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending" hide-submit hide-when-empty
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import SolutionDesignNodeLayout from './SolutionDesignNodeLayout.vue';
import SolutionNodeActions from './SolutionNodeActions.vue';
import SolutionReviewFormTable from './SolutionReviewFormTable.vue';
import GeneratedFormFileCard from '../../GeneratedFormFileCard.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionReviewForm } from '../../../composables/project-stage/solution-design/useSolutionReviewForm.js';
import { getMissingRequiredFields } from '../../../utils/formValidation.js';
import { isOnlineFormContentVisible, isSolutionDesignFormFiller } from '../../../utils/onlineFormVisibility.js';

const fields = [
  { key: 'meetingDate', label: '评审时间', type: 'date', required: true },
  { key: 'meetingLocation', label: '评审地点' },
  { key: 'presenter', label: '主讲人' },
  { key: 'internalParticipants', label: '我方参与人员', type: 'textarea' },
  { key: 'customerParticipants', label: '甲方参与人员', type: 'textarea' },
  { key: 'reviewConclusion', label: '其他补充内容/评审结论', type: 'textarea', required: true },
  { key: 'recorder', label: '记录人', type: 'readonly' }
];
const repeatableFieldConfigs = [
  { key: 'customerRequirements', title: '项目需求分析', addLabel: '添加需求' },
  { key: 'projectTargetDescription', title: '项目目标描述', addLabel: '添加目标' },
  { key: 'technicalRisks', title: '项目风险评估', addLabel: '添加风险' },
  { key: 'solutionSuggestions', title: '项目方案建议', addLabel: '添加建议' }
];

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const base = useSolutionDesignNodePage(props, emit);
const {
  context, workflow, nodeKey, currentNode, localError, returnReasons, isPending,
  runAction, submitNode, approveNode, returnNode
} = base;
const review = useSolutionReviewForm({
  projectId: computed(() => props.projectId),
  authToken: computed(() => props.authToken),
  selectedNodeKey: nodeKey,
  defaultRecorderName: computed(() => props.currentUser?.name || props.currentUser?.account || ''),
  runAction,
  localError
});
const {
  reviewFormData, syncFromWorkflow, loadReviewForm, invalidateRequests,
  implementationPlanItems, updateReviewFormField, repeatableItemsFor, updateRepeatableItem,
  addRepeatableItem, removeRepeatableItem, updateImplementationPlanItem,
  saveReviewForm, submitReviewForm, downloadReviewGeneratedFile
} = review;
const activeDto = computed(() => review.activeReviewFormDto(workflow.value, currentNode.value));
const canViewFormContent = computed(() =>
  isSolutionDesignFormFiller(workflow.value, 'technical_owner', props.currentUser)
  && isOnlineFormContentVisible({
    nodeStatus: activeDto.value?.nodeStatus || currentNode.value?.status,
    formStatus: activeDto.value?.form?.status
  })
);
const reviewFormRoot = ref(null);
const validationAttempted = ref(false);
const missingRequiredFields = computed(() => getMissingRequiredFields(fields, reviewFormData));
const missingPlanItems = computed(() => implementationPlanItems.value.filter((item) => !String(item.planText || '').trim()));
const invalidFieldKeys = computed(() => validationAttempted.value
  ? missingRequiredFields.value.map((field) => field.key)
  : []);
const invalidPlanKeys = computed(() => validationAttempted.value
  ? missingPlanItems.value.map((item) => `${item.sourceType}:${item.sourceIndex}`)
  : []);
const tableRepeatableFieldConfigs = computed(() => repeatableFieldConfigs.map((source) => ({
  ...source,
  items: repeatableItemsFor(source.key)
})));

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
  if (missingRequiredFields.value.length === 0 && missingPlanItems.value.length === 0) {
    try {
      await ElMessageBox.confirm(
        '提交后将生成方案评审记录表，并在生成成功后自动提交当前节点。确认提交？',
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

  const missingLabels = [
    ...missingRequiredFields.value.map((field) => field.label),
    ...missingPlanItems.value.map((item) => `${item.sourceLabel}${item.sourceIndex}实施计划`)
  ];
  ElMessage.warning(`请补充以下必填内容：${missingLabels.join('、')}`);
  await nextTick();
  const firstKey = missingRequiredFields.value[0]?.key;
  const firstPlanKey = missingPlanItems.value[0]
    ? `${missingPlanItems.value[0].sourceType}:${missingPlanItems.value[0].sourceIndex}`
    : '';
  const firstField = firstKey
    ? reviewFormRoot.value?.querySelector(`[data-field-key="${firstKey}"]`)
    : reviewFormRoot.value?.querySelector(`[data-plan-key="${firstPlanKey}"]`);
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}

</script>

<style scoped>
.review-section {
  min-width: 0;
}
</style>
