<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage" :message="localMessage" :local-error="localError">
    <GeneratedFormFileCard button-text="查看项目方案分析表" :generated-file="analysisFormDto?.form?.generatedFile"
      :pending="isPending('analysis:download')" @download="downloadAnalysisGeneratedFile" />
    <SolutionUploadSlots :slots="slots" :is-pending="isPending" @upload="handleUpload" @download="downloadUpload" />

    <section v-if="canViewFormContent" ref="analysisFormRoot" class="analysis-section">

      <el-descriptions :column="3" border>
        <el-descriptions-item label="项目编号">
          {{ project?.projectCode || project?.project_code || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目名称">
          {{ project?.projectName || project?.project_name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="客户名称">
          {{ project?.customerName || project?.customer_name || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <section v-for="section in analysisSections" :key="section.key" class="solution-analysis-form-section">
        <h4>{{ section.title }}</h4>
        <SolutionFormFields :fields="section.fields" :model="analysisFormData" :invalid-field-keys="invalidFieldKeys"
          :disabled="!analysisFormDto?.permissions?.canEditForm" @update="updateAnalysisFormField">
          <template #after-field="{ field }">
            <div v-if="field.imageField" :data-field-key="field.imageField.key" class="solution-form-field-images"
              :class="{
                'online-form-field--invalid': isFieldInvalid(field.imageField.key),
                'solution-form-field-images--full-row': field.imageField.fullRow
              }">
              <div class="form-field-label">
                <strong>{{ field.imageField.label }}</strong>
                <small class="form-field-description">{{ field.imageField.description }}</small>
              </div>
              <el-upload class="solution-form-image-upload" :show-file-list="false" accept="image/png,image/jpeg"
                :disabled="!analysisFormDto?.permissions?.canEditForm || imagesFor(field.imageField).length >= field.imageField.maxImages"
                :http-request="options => uploadAnalysisImage({ field: field.imageField, file: options.file })">
                <el-button type="primary"
                  :disabled="!analysisFormDto?.permissions?.canEditForm || imagesFor(field.imageField).length >= field.imageField.maxImages">
                  选择图片（{{ imagesFor(field.imageField).length }}/{{ field.imageField.maxImages }}）
                </el-button>
              </el-upload>
              <small v-if="isFieldInvalid(field.imageField.key)" class="form-field-error">
                请上传{{ field.imageField.label }}
              </small>
              <div v-for="image in imagesFor(field.imageField)" :key="image.id" class="image-row">
                <span>{{ image.originalFileName }}</span>
                <div>
                  <el-button v-if="image.permissions?.canDownload !== false" type="primary" link
                    @click="downloadAnalysisImage({ image })">
                    下载
                  </el-button>
                  <el-button v-if="image.permissions?.canDelete ?? analysisFormDto?.permissions?.canEditForm"
                    type="danger" link @click="confirmDelete(image)">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </template>
        </SolutionFormFields>
      </section>

      <div class="action-row">
        <el-button :disabled="!analysisFormDto?.permissions?.canEditForm" :loading="isPending('analysis:save')"
          @click="saveAnalysisForm">
          保存草稿
        </el-button>
        <el-button type="primary" :disabled="!analysisFormDto?.permissions?.canSubmitForm"
          :loading="isPending('analysis:submit')" @click="handleSubmitAnalysisForm">
          提交表单
        </el-button>
      </div>
    </section>

    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
      :submit-disabled="generatedBlocksSubmit" :return-reason="returnReasons[nodeKey] || ''"
      @update:return-reason="returnReasons[nodeKey] = $event" @submit="submitNode(nodeKey)"
      @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import SolutionFormFields from '../../../components/project-workspace/solution-design/SolutionFormFields.vue';
import GeneratedFormFileCard from '../../../components/GeneratedFormFileCard.vue';
import { analysisSections } from '../../../components/project-workspace/solution-design/solutionDesignFields.js';
import {
  solutionDesignNodePageProps,
  useSolutionDesignNodePage
} from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { useSolutionAnalysisForm } from '../../../composables/project-stage/solution-design/useSolutionAnalysisForm.js';
import { getMissingRequiredFields } from '../../../utils/formValidation.js';
import { isSolutionDesignFormFiller } from '../../../utils/onlineFormVisibility.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const base = useSolutionDesignNodePage(props, emit);
const {
  context,
  workflow,
  nodeKey,
  currentNode,
  slots,
  localMessage,
  localError,
  returnReasons,
  isPending,
  runAction,
  handleUpload,
  downloadUpload,
  submitNode,
  approveNode,
  returnNode
} = base;

const analysis = useSolutionAnalysisForm({
  projectId: computed(() => props.projectId),
  authToken: computed(() => props.authToken),
  runAction,
  localMessage,
  localError
});
const {
  analysisFormDto,
  analysisFormData,
  syncFromWorkflow,
  loadAnalysisForm,
  invalidateRequests,
  updateAnalysisFormField,
  saveAnalysisForm,
  submitAnalysisForm,
  downloadAnalysisGeneratedFile,
  uploadAnalysisImage,
  downloadAnalysisImage,
  deleteAnalysisImage
} = analysis;

const images = computed(() => analysisFormDto.value?.images || analysisFormDto.value?.form?.images || []);
const analysisFormRoot = ref(null);
const validationAttempted = ref(false);
const validationFields = computed(() => analysisSections.flatMap((section) =>
  section.fields.flatMap((field) => field.imageField
    ? [field, { ...field.imageField, type: 'image' }]
    : [field])
));
const missingRequiredFields = computed(() => getMissingRequiredFields(
  validationFields.value,
  analysisFormData,
  { getImages: imagesFor }
));
const invalidFieldKeys = computed(() => validationAttempted.value
  ? missingRequiredFields.value.map((field) => field.key)
  : []);
const generatedBlocksSubmit = computed(() => {
  const file = analysisFormDto.value?.form?.generatedFile;
  return Boolean(file) && (file.status !== 'generated' || file.canDownload !== true);
});
const canViewFormContent = computed(() => isSolutionDesignFormFiller(workflow.value, 'technical_owner', props.currentUser));

watch(workflow, (value) => {
  syncFromWorkflow(value, true);
  void loadAnalysisForm();
}, { immediate: true });

watch(nodeKey, () => {
  validationAttempted.value = false;
});

onBeforeUnmount(invalidateRequests);

function imagesFor(field) {
  return images.value.filter((item) => item.fieldKey === field.key);
}

function isFieldInvalid(fieldKey) {
  return invalidFieldKeys.value.includes(fieldKey);
}

async function handleSubmitAnalysisForm() {
  validationAttempted.value = true;
  if (missingRequiredFields.value.length === 0) {
    await submitAnalysisForm();
    return;
  }

  ElMessage.warning(`请补充以下必填内容：${missingRequiredFields.value.map((field) => field.label).join('、')}`);
  await nextTick();
  const firstKey = missingRequiredFields.value[0]?.key;
  const firstField = firstKey
    ? analysisFormRoot.value?.querySelector(`[data-field-key="${firstKey}"]`)
    : null;
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}

async function confirmDelete(image) {
  try {
    await ElMessageBox.confirm(
      `确认删除“${image.originalFileName || '该图片'}”吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    );
    await deleteAnalysisImage({ image });
  } catch {
    // 用户取消时不请求、不刷新。
  }
}
</script>
