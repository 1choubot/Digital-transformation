<template>
  <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage" :message="localMessage" :local-error="localError">
    <GeneratedFormFileCard button-text="查看项目方案分析表" :generated-file="analysisFormDto?.form?.generatedFile"
      :pending="isPending('analysis:download')" @download="downloadAnalysisGeneratedFile" />
    <SolutionUploadSlots :slots="slots" :is-pending="isPending"
      @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption" />

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

      <section class="solution-analysis-form-section solution-analysis-environment-section">
        <div class="requirement-template-table-wrap">
          <table class="requirement-template-table">
            <colgroup>
              <col class="requirement-template-table__label" />
              <col class="requirement-template-table__value-part" />
              <col class="requirement-template-table__value-part" />
              <col class="requirement-template-table__label" />
              <col class="requirement-template-table__value" />
            </colgroup>
            <tbody>
              <tr>
                <th rowspan="5" scope="rowgroup">环境要求</th>
                <td colspan="2">
                  <div class="requirement-template-metric">
                    <span>工作温度：（</span>
                    <span data-field-key="workingTemperatureMin" :class="{ 'online-form-field--invalid': isFieldInvalid('workingTemperatureMin') }"><el-input :model-value="analysisFormData.workingTemperatureMin" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="工作温度最小值" @update:model-value="updateAnalysisEnvironmentField('workingTemperatureMin', $event)" /></span>
                    <span>）℃～（</span>
                    <span data-field-key="workingTemperatureMax" :class="{ 'online-form-field--invalid': isFieldInvalid('workingTemperatureMax') }"><el-input :model-value="analysisFormData.workingTemperatureMax" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="工作温度最大值" @update:model-value="updateAnalysisEnvironmentField('workingTemperatureMax', $event)" /></span>
                    <span>）℃</span>
                  </div>
                </td>
                <td colspan="2">
                  <div class="requirement-template-metric">
                    <span>储存温度：（</span>
                    <span data-field-key="storageTemperatureMin" :class="{ 'online-form-field--invalid': isFieldInvalid('storageTemperatureMin') }"><el-input :model-value="analysisFormData.storageTemperatureMin" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="储存温度最小值" @update:model-value="updateAnalysisEnvironmentField('storageTemperatureMin', $event)" /></span>
                    <span>）℃～（</span>
                    <span data-field-key="storageTemperatureMax" :class="{ 'online-form-field--invalid': isFieldInvalid('storageTemperatureMax') }"><el-input :model-value="analysisFormData.storageTemperatureMax" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="储存温度最大值" @update:model-value="updateAnalysisEnvironmentField('storageTemperatureMax', $event)" /></span>
                    <span>）℃</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>工作湿度：（</span><span data-field-key="workingHumidityMin" :class="{ 'online-form-field--invalid': isFieldInvalid('workingHumidityMin') }"><el-input :model-value="analysisFormData.workingHumidityMin" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="工作湿度最小值" @update:model-value="updateAnalysisEnvironmentField('workingHumidityMin', $event)" /></span><span>）%～（</span><span data-field-key="workingHumidityMax" :class="{ 'online-form-field--invalid': isFieldInvalid('workingHumidityMax') }"><el-input :model-value="analysisFormData.workingHumidityMax" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="工作湿度最大值" @update:model-value="updateAnalysisEnvironmentField('workingHumidityMax', $event)" /></span><span>）%</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>储存湿度：（</span><span data-field-key="storageHumidityMin" :class="{ 'online-form-field--invalid': isFieldInvalid('storageHumidityMin') }"><el-input :model-value="analysisFormData.storageHumidityMin" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="储存湿度最小值" @update:model-value="updateAnalysisEnvironmentField('storageHumidityMin', $event)" /></span><span>）%～（</span><span data-field-key="storageHumidityMax" :class="{ 'online-form-field--invalid': isFieldInvalid('storageHumidityMax') }"><el-input :model-value="analysisFormData.storageHumidityMax" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="储存湿度最大值" @update:model-value="updateAnalysisEnvironmentField('storageHumidityMax', $event)" /></span><span>）%</span></div></td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>噪音：≤（</span><span data-field-key="noiseLimitValue" :class="{ 'online-form-field--invalid': isFieldInvalid('noiseLimitValue') }"><el-input :model-value="analysisFormData.noiseLimitValue" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="噪音上限" @update:model-value="updateAnalysisEnvironmentField('noiseLimitValue', $event)" /></span><span>）dB</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>IP 防护等级：IP（</span><span data-field-key="ipProtectionLevel" :class="{ 'online-form-field--invalid': isFieldInvalid('ipProtectionLevel') }"><el-input :model-value="analysisFormData.ipProtectionLevel" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="IP 防护等级" @update:model-value="updateAnalysisEnvironmentField('ipProtectionLevel', $event)" /></span><span>）</span></div></td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>防腐等级：（</span><span data-field-key="antiCorrosionGrade" :class="{ 'online-form-field--invalid': isFieldInvalid('antiCorrosionGrade') }"><el-input :model-value="analysisFormData.antiCorrosionGrade" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="防腐等级" @update:model-value="updateAnalysisEnvironmentField('antiCorrosionGrade', $event)" /></span><span>）</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>海拔高度：≤（</span><span data-field-key="altitudeLimitValue" :class="{ 'online-form-field--invalid': isFieldInvalid('altitudeLimitValue') }"><el-input :model-value="analysisFormData.altitudeLimitValue" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="海拔高度上限" @update:model-value="updateAnalysisEnvironmentField('altitudeLimitValue', $event)" /></span><span>）m</span></div></td>
              </tr>
              <tr>
                <td colspan="4" data-field-key="explosionProofRequirement" :class="{ 'online-form-field--invalid': isFieldInvalid('explosionProofRequirement') }">
                  <div class="requirement-template-metric requirement-template-metric--wide">
                    <span>防爆要求：（</span>
                    <el-input :model-value="analysisFormData.explosionProofRequirement" :disabled="!analysisFormDto?.permissions?.canEditForm" aria-label="防爆要求" @update:model-value="updateAnalysisEnvironmentField('explosionProofRequirement', $event)" />
                    <span>）</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-for="section in standardAnalysisSections" :key="section.key" class="solution-analysis-form-section">
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

      <div class="action-row node-online-form-actions">
        <el-button size="large" :disabled="!analysisFormDto?.permissions?.canEditForm" :loading="isPending('analysis:save')"
          @click="saveAnalysisForm">
          保存草稿
        </el-button>
        <el-button size="large" type="primary" :disabled="!analysisFormDto?.permissions?.canSubmitForm"
          :loading="isPending('analysis:submit')" @click="handleSubmitAnalysisForm">
          提交表单
        </el-button>
      </div>
    </section>

    <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending" hide-submit hide-when-empty
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
  markUploadExemption,
  cancelUploadExemption,
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
const standardAnalysisSections = computed(() => analysisSections.filter(
  (section) => section.key !== 'environmentRequirements'
));
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

function updateAnalysisEnvironmentField(key, value) {
  updateAnalysisFormField({ key, value });
}

async function handleSubmitAnalysisForm() {
  validationAttempted.value = true;
  if (missingRequiredFields.value.length === 0) {
    try {
      await ElMessageBox.confirm(
        '提交后将生成项目方案分析表，并在资料齐套时自动提交当前节点。确认提交？',
        '提交确认',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消'
        }
      );
      await submitAnalysisForm();
    } catch {
      // 用户取消时不请求、不刷新，也不显示错误。
    }
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
