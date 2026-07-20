<template>
  <section v-if="form" ref="editorRoot" class="online-form-editor" aria-label="在线表单动作区">
    <GeneratedFormFileCard
      :generated-file="generatedFile"
      :pending="downloadPending"
      :button-text="downloadButtonText"
      @download="$emit('download-form')"
    />
    <slot name="generated-files" />

    <template v-if="showFormContent">
    <el-alert v-if="blockingReasons.length" :title="`阻塞原因：${blockingReasons.join('；')}`" type="warning" show-icon
      :closable="false" />

    <el-alert v-if="errorMessage" :description="errorMessage" type="error" show-icon :closable="false" />
    <el-form class="online-form-editor__form" :model="formData" @submit.prevent="handleSubmit">
      <section v-if="isInitiationNotice" class="online-form-section initiation-notice-section">
        <div class="initiation-notice-table-wrap">
          <table class="initiation-notice-table">
            <colgroup>
              <col class="initiation-notice-table__code" />
              <col class="initiation-notice-table__name" />
              <col class="initiation-notice-table__customer" />
              <col class="initiation-notice-table__mode" />
              <col class="initiation-notice-table__date" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">项目编号</th>
                <th scope="col">项目名称</th>
                <th scope="col">客户单位</th>
                <th scope="col">开展模式</th>
                <th scope="col">立项日期</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  data-field-key="projectCode"
                  :class="{ 'online-form-field--invalid': isFieldInvalid('projectCode') }"
                >
                  <el-input
                    :model-value="formData.projectCode"
                    :readonly="projectCodeField.readOnly"
                    :disabled="isOnlineFormFieldDisabled(projectCodeField)"
                    aria-label="项目编号"
                    @update:model-value="$emit('update-field', { key: 'projectCode', value: $event })"
                  />
                  <small v-if="isFieldInvalid('projectCode')" class="form-field-error">
                    {{ getFieldValidationMessage('projectCode') }}
                  </small>
                </td>
                <td>{{ formatInitiationNoticeValue(formData.projectName) }}</td>
                <td>{{ formatInitiationNoticeValue(formData.customerUnit) }}</td>
                <td>{{ formatInitiationNoticeValue(formData.projectExecutionMode) }}</td>
                <td>{{ formatInitiationNoticeValue(formData.initiationDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <template v-else>
      <section v-if="isInitiationRequirement" class="online-form-section requirement-template-section">
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
                <th scope="row">项目名称</th>
                <td colspan="2" data-field-key="projectName" :class="getFieldClass(getFormField('projectName'))">
                  <el-input :model-value="formData.projectName" :readonly="getFormField('projectName').readOnly"
                    :disabled="isOnlineFormFieldDisabled(getFormField('projectName'))"
                    @update:model-value="$emit('update-field', { key: 'projectName', value: $event })" />
                </td>
                <th scope="row">客户名称</th>
                <td data-field-key="customerName" :class="getFieldClass(getFormField('customerName'))">
                  <el-input :model-value="formData.customerName" :readonly="getFormField('customerName').readOnly"
                    :disabled="isOnlineFormFieldDisabled(getFormField('customerName'))"
                    @update:model-value="$emit('update-field', { key: 'customerName', value: $event })" />
                </td>
              </tr>
              <tr>
                <th scope="row">交流时间</th>
                <td colspan="2" data-field-key="communicationDate" :class="getFieldClass(getFormField('communicationDate'))">
                  <el-date-picker :model-value="formData.communicationDate" type="date" value-format="YYYY-MM-DD"
                    placeholder="选择日期" :disabled="isOnlineFormFieldDisabled(getFormField('communicationDate'))"
                    @update:model-value="$emit('update-field', { key: 'communicationDate', value: $event || '' })" />
                </td>
                <th scope="row">交流次数</th>
                <td data-field-key="communicationCount" :class="getFieldClass(getFormField('communicationCount'))">
                  <el-input :model-value="formData.communicationCount"
                    :disabled="isOnlineFormFieldDisabled(getFormField('communicationCount'))"
                    @update:model-value="$emit('update-field', { key: 'communicationCount', value: $event })" />
                </td>
              </tr>
              <tr>
                <th scope="row">交流地点</th>
                <td colspan="2" data-field-key="communicationLocation" :class="getFieldClass(getFormField('communicationLocation'))">
                  <el-input :model-value="formData.communicationLocation"
                    :disabled="isOnlineFormFieldDisabled(getFormField('communicationLocation'))"
                    @update:model-value="$emit('update-field', { key: 'communicationLocation', value: $event })" />
                </td>
                <th scope="row">交流方式</th>
                <td data-field-key="communicationMethod" :class="getFieldClass(getFormField('communicationMethod'))">
                  <el-input :model-value="formData.communicationMethod"
                    :disabled="isOnlineFormFieldDisabled(getFormField('communicationMethod'))"
                    @update:model-value="$emit('update-field', { key: 'communicationMethod', value: $event })" />
                </td>
              </tr>
              <tr>
                <th scope="row">我方人员 <span class="requirement-template-table__required">*</span></th>
                <td colspan="4" data-field-key="internalParticipants" :class="getFieldClass(getFormField('internalParticipants'))">
                  <el-input type="textarea" :rows="2" :model-value="formData.internalParticipants"
                    :disabled="isOnlineFormFieldDisabled(getFormField('internalParticipants'))"
                    @update:model-value="$emit('update-field', { key: 'internalParticipants', value: $event })" />
                  <small v-if="isFieldInvalid('internalParticipants')" class="form-field-error">
                    {{ getFieldValidationMessage('internalParticipants') }}
                  </small>
                </td>
              </tr>
              <tr>
                <th scope="row">甲方人员 <span class="requirement-template-table__required">*</span></th>
                <td colspan="4" data-field-key="customerParticipants" :class="getFieldClass(getFormField('customerParticipants'))">
                  <el-input type="textarea" :rows="2" :model-value="formData.customerParticipants"
                    :disabled="isOnlineFormFieldDisabled(getFormField('customerParticipants'))"
                    @update:model-value="$emit('update-field', { key: 'customerParticipants', value: $event })" />
                  <small v-if="isFieldInvalid('customerParticipants')" class="form-field-error">
                    {{ getFieldValidationMessage('customerParticipants') }}
                  </small>
                </td>
              </tr>
              <tr>
                <th rowspan="5" scope="rowgroup">环境要求</th>
                <td colspan="2">
                  <div class="requirement-template-metric">
                    <span>工作温度：（</span>
                    <span data-field-key="workingTemperatureMin" :class="getFieldClass(getFormField('workingTemperatureMin'))"><el-input :model-value="formData.workingTemperatureMin" :disabled="isOnlineFormFieldDisabled(getFormField('workingTemperatureMin'))" aria-label="工作温度最小值" @update:model-value="$emit('update-field', { key: 'workingTemperatureMin', value: $event })" /></span>
                    <span>）℃～（</span>
                    <span data-field-key="workingTemperatureMax" :class="getFieldClass(getFormField('workingTemperatureMax'))"><el-input :model-value="formData.workingTemperatureMax" :disabled="isOnlineFormFieldDisabled(getFormField('workingTemperatureMax'))" aria-label="工作温度最大值" @update:model-value="$emit('update-field', { key: 'workingTemperatureMax', value: $event })" /></span>
                    <span>）℃</span>
                  </div>
                </td>
                <td colspan="2">
                  <div class="requirement-template-metric">
                    <span>储存温度：（</span>
                    <span data-field-key="storageTemperatureMin" :class="getFieldClass(getFormField('storageTemperatureMin'))"><el-input :model-value="formData.storageTemperatureMin" :disabled="isOnlineFormFieldDisabled(getFormField('storageTemperatureMin'))" aria-label="储存温度最小值" @update:model-value="$emit('update-field', { key: 'storageTemperatureMin', value: $event })" /></span>
                    <span>）℃～（</span>
                    <span data-field-key="storageTemperatureMax" :class="getFieldClass(getFormField('storageTemperatureMax'))"><el-input :model-value="formData.storageTemperatureMax" :disabled="isOnlineFormFieldDisabled(getFormField('storageTemperatureMax'))" aria-label="储存温度最大值" @update:model-value="$emit('update-field', { key: 'storageTemperatureMax', value: $event })" /></span>
                    <span>）℃</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>工作湿度：（</span><span data-field-key="workingHumidityMin" :class="getFieldClass(getFormField('workingHumidityMin'))"><el-input :model-value="formData.workingHumidityMin" :disabled="isOnlineFormFieldDisabled(getFormField('workingHumidityMin'))" aria-label="工作湿度最小值" @update:model-value="$emit('update-field', { key: 'workingHumidityMin', value: $event })" /></span><span>）%～（</span><span data-field-key="workingHumidityMax" :class="getFieldClass(getFormField('workingHumidityMax'))"><el-input :model-value="formData.workingHumidityMax" :disabled="isOnlineFormFieldDisabled(getFormField('workingHumidityMax'))" aria-label="工作湿度最大值" @update:model-value="$emit('update-field', { key: 'workingHumidityMax', value: $event })" /></span><span>）%</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>储存湿度：（</span><span data-field-key="storageHumidityMin" :class="getFieldClass(getFormField('storageHumidityMin'))"><el-input :model-value="formData.storageHumidityMin" :disabled="isOnlineFormFieldDisabled(getFormField('storageHumidityMin'))" aria-label="储存湿度最小值" @update:model-value="$emit('update-field', { key: 'storageHumidityMin', value: $event })" /></span><span>）%～（</span><span data-field-key="storageHumidityMax" :class="getFieldClass(getFormField('storageHumidityMax'))"><el-input :model-value="formData.storageHumidityMax" :disabled="isOnlineFormFieldDisabled(getFormField('storageHumidityMax'))" aria-label="储存湿度最大值" @update:model-value="$emit('update-field', { key: 'storageHumidityMax', value: $event })" /></span><span>）%</span></div></td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>噪音：≤（</span><span data-field-key="noiseLimitValue" :class="getFieldClass(getFormField('noiseLimitValue'))"><el-input :model-value="formData.noiseLimitValue" :disabled="isOnlineFormFieldDisabled(getFormField('noiseLimitValue'))" aria-label="噪音上限值" @update:model-value="$emit('update-field', { key: 'noiseLimitValue', value: $event })" /></span><span>）dB</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>IP 防护等级：IP（</span><span data-field-key="ipProtectionLevel" :class="getFieldClass(getFormField('ipProtectionLevel'))"><el-input :model-value="formData.ipProtectionLevel" :disabled="isOnlineFormFieldDisabled(getFormField('ipProtectionLevel'))" aria-label="IP 防护等级" @update:model-value="$emit('update-field', { key: 'ipProtectionLevel', value: $event })" /></span><span>）</span></div></td>
              </tr>
              <tr>
                <td colspan="2"><div class="requirement-template-metric"><span>防腐等级：（</span><span data-field-key="antiCorrosionGrade" :class="getFieldClass(getFormField('antiCorrosionGrade'))"><el-input :model-value="formData.antiCorrosionGrade" :disabled="isOnlineFormFieldDisabled(getFormField('antiCorrosionGrade'))" aria-label="防腐等级" @update:model-value="$emit('update-field', { key: 'antiCorrosionGrade', value: $event })" /></span><span>）</span></div></td>
                <td colspan="2"><div class="requirement-template-metric"><span>海拔高度：≤（</span><span data-field-key="altitudeLimitValue" :class="getFieldClass(getFormField('altitudeLimitValue'))"><el-input :model-value="formData.altitudeLimitValue" :disabled="isOnlineFormFieldDisabled(getFormField('altitudeLimitValue'))" aria-label="海拔高度上限值" @update:model-value="$emit('update-field', { key: 'altitudeLimitValue', value: $event })" /></span><span>）m</span></div></td>
              </tr>
              <tr>
                <td colspan="4" data-field-key="explosionProofRequirement" :class="getFieldClass(getFormField('explosionProofRequirement'))">
                  <div class="requirement-template-metric requirement-template-metric--wide">
                    <span>防爆要求：（</span>
                    <el-input :model-value="formData.explosionProofRequirement" :disabled="isOnlineFormFieldDisabled(getFormField('explosionProofRequirement'))" aria-label="防爆要求" @update:model-value="$emit('update-field', { key: 'explosionProofRequirement', value: $event })" />
                    <span>）</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-for="section in getStandardSchemaSections(form)" :key="section.key" class="online-form-section">
        <h4 v-if="section.title">{{ section.title }}</h4>
        <div class="form-grid">
          <template v-for="item in getDisplayItems(section.fields)" :key="item.key">
          <section v-if="item.type === 'threshold-group'" class="threshold-field-group"
            :class="{ 'threshold-field-group--paired': item.paired }">
            <h5 class="threshold-field-group__heading">
              <span>{{ item.label }}</span>
              <small v-if="item.description" class="form-field-description">{{ item.description }}</small>
            </h5>
            <div class="threshold-field-group__inputs">
              <label v-for="field in item.fields" :key="field.key" :data-field-key="field.key"
                :class="[getFieldClass(field), 'threshold-field-input']">
                <span class="form-field-label">
                  <span>{{ field.limitLabel }}{{ field.required ? ' *' : '' }}</span>
                </span>
                <el-input :model-value="formData[field.key]" :readonly="field.readOnly"
                  :disabled="isOnlineFormFieldDisabled(field)"
                  @update:model-value="$emit('update-field', { key: field.key, value: $event })" />
                <small v-if="isFieldInvalid(field.key)" class="form-field-error">
                  {{ getFieldValidationMessage(field.key) }}
                </small>
              </label>
            </div>
          </section>

          <template v-else v-for="field in [item.field]" :key="field.key">
          <label :data-field-key="field.key" :class="getFieldClass(field)">
            <span class="form-field-label">
              <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
              <small v-if="field.description" class="form-field-description">{{ field.description }}</small>
            </span>
            <el-select v-if="field.type === 'select'" :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)" placeholder="请选择"
              @change="$emit('update-field', { key: field.key, value: $event })">
              <el-option v-for="option in field.options || []" :key="option" :label="option" :value="option" />
            </el-select>
            <el-select v-else-if="field.type === 'score'" :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)" placeholder="请选择分值"
              @change="$emit('update-field', { key: field.key, value: String($event) })">
              <el-option v-for="score in scoreOptions" :key="score" :label="String(score)" :value="String(score)" />
            </el-select>
            <el-input v-else-if="field.type === 'textarea'" type="textarea" :rows="3" :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event })" />
            <div v-else-if="field.type === 'image'" class="online-form-image-field">
              <div v-if="getOnlineFormImages(field.key).length" class="online-form-image-field__list">
                <div v-for="(image, imageIndex) in getOnlineFormImages(field.key)" :key="image.id"
                  class="online-form-image-field__current">
                  <div>
                    <strong>{{ imageIndex + 1 }}. {{ image.originalFileName }}</strong>
                    <small>{{ formatFileSize(image.fileSize) }}</small>
                  </div>
                  <div class="online-form-image-field__actions">
                    <el-button link type="primary" :loading="isImageDownloadPending(image)"
                      @click="$emit('download-image', { field, image })">
                      下载
                    </el-button>
                    <el-button link type="danger" :loading="isImageDeletePending(image)"
                      :disabled="isOnlineFormFieldDisabled(field)" @click="$emit('delete-image', { field, image })">
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
              <el-upload class="online-form-image-field__upload" :show-file-list="false" accept="image/png,image/jpeg"
                :disabled="isOnlineFormFieldDisabled(field) || isImageUploadPending(field) || isImageLimitReached(field)"
                :http-request="(request) => handleImageUpload(field, request)">
                <el-button type="primary" :loading="isImageUploadPending(field)"
                  :disabled="isOnlineFormFieldDisabled(field) || isImageLimitReached(field)">
                  {{ getImageUploadText(field) }}
                </el-button>
              </el-upload>
            </div>
            <el-date-picker v-else-if="field.type === 'date'" :model-value="formData[field.key]" type="date"
              value-format="YYYY-MM-DD" placeholder="选择日期" :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event || '' })" />
            <el-input v-else :model-value="formData[field.key]" :readonly="field.readOnly"
              :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event })" />
            <small v-if="isFieldInvalid(field.key)" class="form-field-error">
              {{ getFieldValidationMessage(field.key) }}
            </small>
          </label>
          </template>
          </template>
        </div>
      </section>
      </template>

      <section
        v-for="section in form.schema?.scoringSections || []"
        :key="section.key"
        class="online-form-section online-form-score-section"
        :data-score-section-key="section.key"
      >
        <button
          class="online-form-score-section__toggle"
          type="button"
          :aria-expanded="isScoringSectionExpanded(section)"
          :aria-controls="`score-section-${section.key}`"
          @click="toggleScoringSection(section)"
        >
          <span>{{ formatScoringSectionTitle(section) }}</span>
          <span class="online-form-score-section__toggle-icon" aria-hidden="true">
            {{ isScoringSectionExpanded(section) ? '⌃' : '⌄' }}
          </span>
        </button>
        <div
          v-show="isScoringSectionExpanded(section)"
          :id="`score-section-${section.key}`"
          class="online-form-score-table-wrap"
        >
          <div class="online-form-score-table">
            <div class="online-form-score-table__header" aria-hidden="true">
              <span>评价项</span><span>评价标准</span><span>分值（0-5）</span><span>信息收集说明</span><span>责任人</span>
            </div>
            <div class="online-form-score-list">
          <article v-for="item in section.items || []" :key="item.key" :data-field-key="`${item.key}Score`"
            class="online-form-score-card"
            :class="{ 'online-form-field--invalid': isFieldInvalid(`${item.key}Score`) }">
            <header class="online-form-score-card__item">
              <strong>{{ item.itemName }}</strong>
            </header>
            <dl class="online-form-score-card__template">
              <div>
                <dt>评价标准</dt>
                <dd>
                  <span v-for="(line, lineIndex) in formatEvaluationStandardLines(item.evaluationStandard)" :key="lineIndex">
                    {{ line }}
                  </span>
                </dd>
              </div>
            </dl>
            <div class="online-form-score-card__inputs">
              <label>
                <span class="online-form-score-card__mobile-label">分值（0-5）*</span>
                <el-select :model-value="formData[`${item.key}Score`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)" placeholder="请选择分值"
                  @change="$emit('update-field', { key: `${item.key}Score`, value: $event })">
                  <el-option v-for="score in scoreOptions" :key="score" :label="String(score)" :value="String(score)" />
                </el-select>
                <small v-if="isFieldInvalid(`${item.key}Score`)" class="form-field-error">
                  {{ getFieldValidationMessage(`${item.key}Score`) }}
                </small>
              </label>
              <label>
                <span class="online-form-score-card__mobile-label">信息收集说明（选填）</span>
                <el-input type="textarea" :rows="4" :model-value="formData[`${item.key}InformationNotes`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @update:model-value="$emit('update-field', { key: `${item.key}InformationNotes`, value: $event })" />
              </label>
              <label>
                <span class="online-form-score-card__mobile-label">责任人（选填）</span>
                <el-input :model-value="formData[`${item.key}ResponsiblePerson`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @update:model-value="$emit('update-field', { key: `${item.key}ResponsiblePerson`, value: $event })" />
              </label>
            </div>
          </article>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showReviewOpinions && displayedReviewOpinions.length" class="online-form-section">
        <div
          class="online-form-review-opinions"
          :class="{ 'online-form-review-opinions--two-column': displayedReviewOpinions.length === 2 }"
        >
          <article v-for="opinion in displayedReviewOpinions" :key="opinion.nodeKey" class="online-form-review-opinion">
            <strong>{{ opinion.nodeName }}</strong>
            <el-tag :type="statusTagType(opinion.nodeStatus)">
              {{ formatReviewOpinionStatus(opinion.nodeStatus) }}
            </el-tag>
            <p>{{ opinion.comment || opinion.returnReason || '暂无意见' }}</p>
            <small>
              {{ opinion.reviewedByName || opinion.reviewerName || '待处理' }}{{ opinion.reviewedAt ? ` ·
              ${opinion.reviewedAt}` : '' }}
            </small>
          </article>
        </div>
      </section>

      <div class="form-actions online-form-editor__actions node-online-form-actions">
        <el-button size="large" :loading="saving" :disabled="!form.permissions?.canEdit" @click="$emit('save')">
          保存草稿
        </el-button>
        <el-button size="large" type="primary" native-type="submit" :loading="submitting"
          :disabled="!form.permissions?.canSubmit">
          提交表单
        </el-button>
      </div>
    </el-form>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import GeneratedFormFileCard from '../GeneratedFormFileCard.vue';
import { getMissingRequiredFields } from '../../utils/formValidation.js';
import { groupThresholdFields } from '../../utils/thresholdFieldGroups.js';

const emit = defineEmits([
  'save',
  'submit',
  'update-field',
  'upload-image',
  'download-image',
  'delete-image',
  'download-form'
]);

const props = defineProps({
  form: {
    type: Object,
    default: null
  },
  nodeStatus: {
    type: String,
    default: ''
  },
  blockingReasons: {
    type: Array,
    default: () => []
  },
  formData: {
    type: Object,
    required: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  saving: {
    type: Boolean,
    default: false
  },
  submitting: {
    type: Boolean,
    default: false
  },
  generatedFile: {
    type: Object,
    default: null
  },
  downloadPending: {
    type: Boolean,
    default: false
  },
  downloadButtonText: {
    type: String,
    default: '查看表单'
  },
  showFormContent: {
    type: Boolean,
    default: true
  },
  imageState: {
    type: Object,
    default: () => ({})
  },
  showReviewOpinions: {
    type: Boolean,
    default: true
  }
});

const scoreOptions = [0, 1, 2, 3, 4, 5];
const editorRoot = ref(null);
const validationAttempted = ref(false);
const expandedScoringSections = ref({});
const schemaFields = computed(() => props.form?.schema?.fields || []);
const sectionFields = computed(() => (props.form?.schema?.sections || []).flatMap((section) => section.fields || []));
const isInitiationNotice = computed(() => props.form?.documentCode === '1.3');
const isInitiationRequirement = computed(() => props.form?.documentCode === '1.1');
const projectCodeField = computed(() => schemaFields.value.find((field) => field.key === 'projectCode') || ({
  key: 'projectCode',
  label: '项目编号',
  required: true
}));
const displayedReviewOpinions = computed(() =>
  (props.form?.reviewOpinions || []).filter((opinion) => opinion.nodeKey !== 'general_review')
);
const missingRequiredFields = computed(() => getMissingRequiredFields(
  schemaFields.value,
  props.formData,
  {
    includeField: isFieldInSubmitScope,
    getImages: (field) => getOnlineFormImages(field.key)
  }
));
const invalidFieldKeys = computed(() => validationAttempted.value
  ? missingRequiredFields.value.map((field) => field.key)
  : []);

watch(
  () => [
    props.form?.id || props.form?.stageDocumentId || props.form?.documentCode || null,
    props.form?.permissions?.canEdit === true,
    props.form?.permissions?.editablePart || '',
    (props.form?.schema?.scoringSections || []).map((section) => `${section.key}:${section.editablePart || ''}`).join('|')
  ],
  () => {
    validationAttempted.value = false;
    initializeScoringSectionExpansion();
  },
  { immediate: true }
);

function initializeScoringSectionExpansion() {
  const editablePart = props.form?.permissions?.editablePart;
  const canEdit = props.form?.permissions?.canEdit === true;
  expandedScoringSections.value = Object.fromEntries(
    (props.form?.schema?.scoringSections || []).map((section) => [
      section.key,
      canEdit && ['business', 'technical'].includes(editablePart) && section.editablePart === editablePart
    ])
  );
}

function isScoringSectionExpanded(section) {
  return expandedScoringSections.value[section.key] !== false;
}

function toggleScoringSection(section) {
  expandedScoringSections.value = { ...expandedScoringSections.value, [section.key]: !isScoringSectionExpanded(section) };
}

function formatScoringSectionTitle(section) {
  if (section.editablePart === 'business') return '商务板块';
  if (section.editablePart === 'technical') return '技术板块';
  return String(section.title || '').replace('模块', '板块');
}

function formatEvaluationStandardLines(value) {
  const text = String(value || '').trim();
  if (!text) return ['-'];
  return text.split('；').map((line) => line.trim()).filter(Boolean);
}

function getSchemaSections(form) {
  if (Array.isArray(form?.schema?.sections) && form.schema.sections.length > 0) {
    return form.schema.sections;
  }

  return [
    {
      key: 'default',
      title: '表单内容',
      fields: form?.schema?.fields || []
    }
  ];
}

function getStandardSchemaSections(form) {
  const sections = getSchemaSections(form);
  if (!isInitiationRequirement.value) return sections;
  return sections.filter((section) => !['basicInfo', 'environmentRequirements'].includes(section.key));
}

function getFormField(fieldKey) {
  return schemaFields.value.find((field) => field.key === fieldKey)
    || sectionFields.value.find((field) => field.key === fieldKey)
    || { key: fieldKey, label: fieldKey, type: 'text', required: false };
}

function getDisplayItems(fields) {
  return groupThresholdFields(fields || []);
}

function formatInitiationNoticeValue(value) {
  const text = String(value ?? '').trim();
  return text || '-';
}

function getFieldClass(field) {
  return {
    'form-grid__wide': field.type === 'textarea' || field.type === 'image',
    'online-form-field--readonly': field.readOnly,
    'online-form-field--invalid': isFieldInvalid(field.key)
  };
}

function isFieldInSubmitScope(field) {
  const editablePart = props.form?.permissions?.editablePart;
  return !field.editablePart || !editablePart || field.editablePart === editablePart;
}

function isFieldInvalid(fieldKey) {
  return invalidFieldKeys.value.includes(fieldKey);
}

function getFieldValidationMessage(fieldKey) {
  return missingRequiredFields.value.find((field) => field.key === fieldKey)?.message || '请完成该必填项';
}

async function handleSubmit() {
  validationAttempted.value = true;
  if (missingRequiredFields.value.length === 0) {
    emit('submit');
    return;
  }

  ElMessage.warning(`请补充以下必填内容：${missingRequiredFields.value.map((field) => field.label).join('、')}`);
  const firstMissingField = missingRequiredFields.value[0];
  if (firstMissingField?.sectionKey) {
    expandedScoringSections.value = { ...expandedScoringSections.value, [firstMissingField.sectionKey]: true };
  }
  await nextTick();
  const firstFieldKey = firstMissingField?.key;
  const firstField = firstFieldKey
    ? editorRoot.value?.querySelector(`[data-field-key="${firstFieldKey}"]`)
    : null;
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}

function getOnlineFormImages(fieldKey) {
  return (props.form?.images || []).filter((image) => image.fieldKey === fieldKey);
}

function getImageLimit(field) {
  const maxImages = Number(field?.maxImages);
  return Number.isSafeInteger(maxImages) && maxImages > 0 ? maxImages : 3;
}

function isImageLimitReached(field) {
  return getOnlineFormImages(field.key).length >= getImageLimit(field);
}

function getImageUploadText(field) {
  if (isImageUploadPending(field)) {
    return '上传中...';
  }
  const count = getOnlineFormImages(field.key).length;
  const limit = getImageLimit(field);
  return count >= limit ? `已达上限 ${limit} 张` : `选择图片（${count}/${limit}）`;
}

function isImageUploadPending(field) {
  return props.imageState?.uploadPendingFieldKey === field.key;
}

function isImageDownloadPending(image) {
  return Boolean(image?.id) && String(props.imageState?.downloadPendingId ?? '') === String(image.id);
}

function isImageDeletePending(image) {
  return Boolean(image?.id) && String(props.imageState?.deletePendingId ?? '') === String(image.id);
}

function handleImageUpload(field, { file }) {
  if (!file || isOnlineFormFieldDisabled(field) || isImageLimitReached(field)) {
    return;
  }
  emit('upload-image', { field, file });
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function isOnlineFormFieldDisabled(field) {
  return field.readOnly || isOnlineFormPartDisabled(field.editablePart);
}

function isOnlineFormPartDisabled(editablePart) {
  const permissions = props.form?.permissions || {};
  if (!permissions.canEdit || props.submitting) {
    return true;
  }

  return Boolean(editablePart) && editablePart !== permissions.editablePart;
}

function formatCollaborationPartStatus(value) {
  return value ? '已提交' : '待填写';
}

function formatEditablePart(part) {
  return {
    business: '基础信息和商务板块',
    technical: '技术板块'
  }[part] || '仅查看';
}


function statusTagType(status) {
  if (['completed', 'confirmed', 'approved'].includes(status)) return 'success';
  if (['submitted', 'pending', 'pending_review', 'pending_general_review'].includes(status)) return 'warning';
  if (['returned', 'blocked_by_rework', 'returned_for_rework', 'returned_blocked_by_rework', 'invalidated'].includes(status)) {
    return 'danger';
  }
  if (['draft', 'not_started', 'not_submitted', 'not_configured', 'not_applicable', 'process_node', 'waiting_document_submission', 'waiting_prerequisite'].includes(status)) {
    return 'info';
  }
  return 'primary';
}

function formatHeaderStatus(nodeStatus, formStatus) {
  const status = nodeStatus || formStatus;
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待审批',
    pending_general_review: '待总经理审批',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    process_node: '过程节点',
    not_configured: '未配置',
    not_applicable: '不适用',
    draft: '草稿',
    not_submitted: '未提交',
    submitted: '已提交',
    confirmed: '已完成',
    returned: '已退回'
  }[status] || status || '-';
}

function formatReviewOpinionStatus(status) {
  return {
    waiting_document_submission: '待表单提交',
    pending: '待处理',
    approved: '已通过',
    returned_blocked_by_rework: '已退回',
    waiting_prerequisite: '等待前置评价',
    invalidated: '已失效'
  }[status] || status || '-';
}
</script>
