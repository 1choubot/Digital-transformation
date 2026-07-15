<template>
  <GeneratedFormFileCard :generated-file="activeDto?.form?.generatedFile"
    :pending="isPending(`review:${nodeKey}:download`)" @download="downloadReviewGeneratedFile(nodeKey)" />
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <section ref="reviewFormRoot" class="review-section">

      <SolutionFormFields :fields="fields" :model="reviewFormData" :invalid-field-keys="invalidFieldKeys"
        :disabled="!activeDto?.permissions?.canEditReviewForm" @update="updateReviewFormField" />
      <div class="action-row">
        <el-button :disabled="!activeDto?.permissions?.canEditReviewForm" :loading="isPending(`review:${nodeKey}:save`)"
          @click="saveReviewForm(nodeKey)">
          保存草稿
        </el-button>
        <el-button type="primary" :disabled="!activeDto?.permissions?.canSubmitReviewForm"
          :loading="isPending(`review:${nodeKey}:submit`)" @click="handleSubmitReviewForm">
          提交表单
        </el-button>
      </div>
    </section>
    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import SolutionDesignNodeLayout from './SolutionDesignNodeLayout.vue';
import SolutionNodeActions from './SolutionNodeActions.vue';
import SolutionFormFields from './SolutionFormFields.vue';
import GeneratedFormFileCard from '../../GeneratedFormFileCard.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionReviewForm } from '../../../composables/project-stage/solution-design/useSolutionReviewForm.js';
import { getMissingRequiredFields } from '../../../utils/formValidation.js';

const fields = [
  { key: 'meetingDate', label: '评审时间', type: 'date', required: true },
  { key: 'meetingLocation', label: '评审地点' },
  { key: 'presenter', label: '主讲人' },
  { key: 'internalParticipants', label: '我方参与人员', type: 'textarea' },
  { key: 'customerParticipants', label: '甲方参与人员', type: 'textarea' },
  { key: 'customerRequirements', label: '项目需求分析', type: 'textarea' },
  { key: 'projectTargetDescription', label: '项目目标描述', type: 'textarea' },
  { key: 'technicalRisks', label: '项目风险评估', type: 'textarea' },
  { key: 'solutionSuggestions', label: '项目方案建议', type: 'textarea' },
  { key: 'actionItems', label: '项目实施计划', type: 'textarea', required: true },
  { key: 'reviewConclusion', label: '其他补充内容/评审结论', type: 'textarea', required: true },
  { key: 'recorder', label: '记录人', type: 'readonly' }
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
  updateReviewFormField, saveReviewForm, submitReviewForm, downloadReviewGeneratedFile
} = review;
const activeDto = computed(() => review.activeReviewFormDto(workflow.value, currentNode.value));
const reviewFormRoot = ref(null);
const validationAttempted = ref(false);
const missingRequiredFields = computed(() => getMissingRequiredFields(fields, reviewFormData));
const invalidFieldKeys = computed(() => validationAttempted.value
  ? missingRequiredFields.value.map((field) => field.key)
  : []);

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
    await submitReviewForm(nodeKey.value);
    return;
  }

  ElMessage.warning(`请补充以下必填内容：${missingRequiredFields.value.map((field) => field.label).join('、')}`);
  await nextTick();
  const firstKey = missingRequiredFields.value[0]?.key;
  const firstField = firstKey
    ? reviewFormRoot.value?.querySelector(`[data-field-key="${firstKey}"]`)
    : null;
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}
</script>
