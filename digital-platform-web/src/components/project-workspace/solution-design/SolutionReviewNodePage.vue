<template>
  <GeneratedFormFileCard :generated-file="activeDto?.form?.generatedFile"
    :pending="isPending(`review:${nodeKey}:download`)" @download="downloadReviewGeneratedFile(nodeKey)" />
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage">
    <section v-if="canViewFormContent" ref="reviewFormRoot" class="review-section">

      <SolutionFormFields :fields="fields" :model="reviewFormData" :invalid-field-keys="invalidFieldKeys"
        :disabled="!activeDto?.permissions?.canEditReviewForm" @update="updateReviewFormField" />
      <div class="review-repeatable-grid">
        <SolutionRepeatableItems
          v-for="source in repeatableFieldConfigs"
          :key="source.key"
          :field-key="source.key"
          :title="source.title"
          :add-label="source.addLabel"
          :items="repeatableItemsFor(source.key)"
          :disabled="!activeDto?.permissions?.canEditReviewForm"
          @update="payload => updateRepeatableItem({ key: source.key, ...payload })"
          @add="addRepeatableItem(source.key)"
          @remove="payload => removeRepeatableItem({ key: source.key, ...payload })"
        />
      </div>
      <section class="implementation-plan-section">
        <div class="implementation-plan-section__heading">
          <h4>项目实施计划</h4>
        </div>
        <el-empty v-if="implementationPlanItems.length === 0" description="填写需求、目标、风险或建议后生成实施计划项" :image-size="44" />
        <div v-else class="implementation-plan-list">
          <article v-for="item in implementationPlanItems" :key="`${item.sourceType}:${item.sourceIndex}`"
            class="implementation-plan-item"
            :data-plan-key="`${item.sourceType}:${item.sourceIndex}`"
            :class="{ 'implementation-plan-item--invalid': isPlanItemInvalid(item) }">
            <div class="implementation-plan-item__source">
              <strong>{{ item.sourceLabel }}{{ item.sourceIndex }}</strong>
              <span>{{ item.sourceText }}</span>
            </div>
            <el-input :model-value="item.planText" type="textarea" :rows="2"
              :disabled="!activeDto?.permissions?.canEditReviewForm"
              placeholder="填写对应实施计划"
              @update:model-value="value => updateImplementationPlanItem({ sourceType: item.sourceType, sourceIndex: item.sourceIndex, planText: value })" />
            <small v-if="isPlanItemInvalid(item)" class="form-field-error">请填写实施计划内容</small>
          </article>
        </div>
      </section>
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
import SolutionFormFields from './SolutionFormFields.vue';
import SolutionRepeatableItems from './SolutionRepeatableItems.vue';
import GeneratedFormFileCard from '../../GeneratedFormFileCard.vue';
import { solutionDesignNodePageProps, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionReviewForm } from '../../../composables/project-stage/solution-design/useSolutionReviewForm.js';
import { getMissingRequiredFields } from '../../../utils/formValidation.js';
import { isSolutionDesignFormFiller } from '../../../utils/onlineFormVisibility.js';

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
const canViewFormContent = computed(() => isSolutionDesignFormFiller(workflow.value, 'technical_owner', props.currentUser));
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

function isPlanItemInvalid(item) {
  return invalidPlanKeys.value.includes(`${item.sourceType}:${item.sourceIndex}`);
}
</script>

<style scoped>
.implementation-plan-section {
  margin-top: 16px;
}

.review-repeatable-grid {
  display: grid;
  gap: 16px;
}

.implementation-plan-section__heading {
  margin-bottom: 12px;
}

.implementation-plan-section__heading h4 {
  margin: 0;
}

.implementation-plan-list {
  display: grid;
  gap: 12px;
}

.implementation-plan-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}

.implementation-plan-item--invalid {
  border-color: var(--el-color-danger);
}

.implementation-plan-item__source {
  display: grid;
  gap: 4px;
}

.implementation-plan-item__source span {
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
}

.form-field-error {
  color: var(--el-color-danger);
}
</style>
