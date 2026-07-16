<template>
  <div class="review-form-table-wrap">
    <table class="review-form-table">
      <colgroup>
        <col class="review-form-table__label" />
        <col class="review-form-table__value" />
        <col class="review-form-table__label" />
        <col class="review-form-table__value" />
      </colgroup>
      <tbody>
        <tr>
          <th scope="row">评审时间 <span class="review-form-table__required">*</span></th>
          <td data-field-key="meetingDate" :class="fieldClass('meetingDate')">
            <el-date-picker
              :model-value="displayValue(model.meetingDate)"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              :disabled="disabled"
              aria-label="评审时间"
              @update:model-value="updateField('meetingDate', $event || '')"
            />
          </td>
          <th scope="row">评审地点</th>
          <td data-field-key="meetingLocation" :class="fieldClass('meetingLocation')">
            <el-input
              :model-value="displayValue(model.meetingLocation)"
              :disabled="disabled"
              aria-label="评审地点"
              @update:model-value="updateField('meetingLocation', $event)"
            />
          </td>
        </tr>
        <tr>
          <th scope="row">主讲人</th>
          <td data-field-key="presenter" :class="fieldClass('presenter')">
            <el-input
              :model-value="displayValue(model.presenter)"
              :disabled="disabled"
              aria-label="主讲人"
              @update:model-value="updateField('presenter', $event)"
            />
          </td>
          <th scope="row">记录人</th>
          <td data-field-key="recorder" :class="fieldClass('recorder')">
            <el-input :model-value="displayValue(model.recorder)" disabled aria-label="记录人" />
          </td>
        </tr>
        <tr>
          <th scope="row">我方参与人员</th>
          <td colspan="3" data-field-key="internalParticipants" :class="fieldClass('internalParticipants')">
            <el-input
              :model-value="displayValue(model.internalParticipants)"
              type="textarea"
              :rows="2"
              :disabled="disabled"
              aria-label="我方参与人员"
              @update:model-value="updateField('internalParticipants', $event)"
            />
          </td>
        </tr>
        <tr>
          <th scope="row">甲方参与人员</th>
          <td colspan="3" data-field-key="customerParticipants" :class="fieldClass('customerParticipants')">
            <el-input
              :model-value="displayValue(model.customerParticipants)"
              type="textarea"
              :rows="2"
              :disabled="disabled"
              aria-label="甲方参与人员"
              @update:model-value="updateField('customerParticipants', $event)"
            />
          </td>
        </tr>

        <template v-for="source in repeatableFieldConfigs" :key="source.key">
          <tr class="review-form-table__section-heading">
            <th colspan="4" scope="rowgroup">
              <div class="review-form-table__section-heading-content">
                <span>{{ source.title }}</span>
                <el-button class="review-form-table__row-action" size="small" type="primary" plain :disabled="disabled" @click="$emit('add-repeatable', source.key)">
                  新增一行
                </el-button>
              </div>
            </th>
          </tr>
          <tr
            v-for="(item, index) in source.items"
            :key="`${source.key}:${index}`"
            :data-field-key="source.key"
            :class="fieldClass(source.key)"
          >
            <td colspan="4">
              <div class="review-form-table__repeatable-row">
                <span class="review-form-table__index">{{ index + 1 }}</span>
                <el-input
                  :model-value="item"
                  type="textarea"
                  :rows="1"
                  :disabled="disabled"
                  :aria-label="`${source.title}${index + 1}`"
                  @update:model-value="value => $emit('update-repeatable', { key: source.key, index, value })"
                />
                <el-button
                  class="review-form-table__row-action"
                  type="danger"
                  plain
                  size="small"
                  :disabled="disabled || source.items.length <= 1"
                  :aria-label="`删除${source.title}${index + 1}`"
                  @click="$emit('remove-repeatable', { key: source.key, index })"
                >
                  删除
                </el-button>
              </div>
            </td>
          </tr>
        </template>

        <tr class="review-form-table__section-heading">
          <th colspan="4" scope="rowgroup">项目实施计划</th>
        </tr>
        <tr v-if="implementationPlanItems.length === 0">
          <td colspan="4" class="review-form-table__empty">填写需求、目标、风险或建议后生成实施计划项</td>
        </tr>
        <tr
          v-for="item in implementationPlanItems"
          v-else
          :key="`${item.sourceType}:${item.sourceIndex}`"
          :data-plan-key="`${item.sourceType}:${item.sourceIndex}`"
          :class="{ 'review-form-table__cell--invalid': isPlanInvalid(item) }"
        >
          <th scope="row">{{ item.sourceLabel }}{{ item.sourceIndex }}</th>
          <td class="review-form-table__source-text">{{ item.sourceText }}</td>
          <td colspan="2">
            <el-input
              :model-value="item.planText"
              type="textarea"
              :rows="1"
              :disabled="disabled"
              :aria-label="`${item.sourceLabel}${item.sourceIndex}实施计划`"
              placeholder="填写对应实施计划"
              @update:model-value="planText => $emit('update-plan', { sourceType: item.sourceType, sourceIndex: item.sourceIndex, planText })"
            />
            <small v-if="isPlanInvalid(item)" class="form-field-error">请填写实施计划内容</small>
          </td>
        </tr>

        <tr>
          <th scope="row">其他补充内容/评审结论 <span class="review-form-table__required">*</span></th>
          <td colspan="3" data-field-key="reviewConclusion" :class="fieldClass('reviewConclusion')">
            <el-input
              :model-value="displayValue(model.reviewConclusion)"
              type="textarea"
              :rows="3"
              :disabled="disabled"
              aria-label="其他补充内容/评审结论"
              @update:model-value="updateField('reviewConclusion', $event)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  model: { type: Object, required: true },
  repeatableFieldConfigs: { type: Array, default: () => [] },
  implementationPlanItems: { type: Array, default: () => [] },
  invalidFieldKeys: { type: Array, default: () => [] },
  invalidPlanKeys: { type: Array, default: () => [] },
  disabled: Boolean
});

const emit = defineEmits([
  'update-field',
  'update-repeatable',
  'add-repeatable',
  'remove-repeatable',
  'update-plan'
]);

function displayValue(value) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function updateField(key, value) {
  emit('update-field', { key, value });
}

function fieldClass(key) {
  return { 'review-form-table__cell--invalid': props.invalidFieldKeys.includes(key) };
}

function isPlanInvalid(item) {
  return props.invalidPlanKeys.includes(`${item.sourceType}:${item.sourceIndex}`);
}
</script>

<style scoped>
.review-form-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--el-border-color);
}

.review-form-table {
  width: 100%;
  min-width: 920px;
  table-layout: fixed;
  border-collapse: collapse;
  background: var(--el-bg-color);
}

.review-form-table__label {
  width: 150px;
}

.review-form-table__value {
  width: calc(50% - 150px);
}

.review-form-table th,
.review-form-table td {
  padding: 8px;
  border-right: 1px solid var(--el-border-color);
  border-bottom: 1px solid var(--el-border-color);
  vertical-align: middle;
}

.review-form-table tr:last-child > * {
  border-bottom: 0;
}

.review-form-table tr > *:last-child {
  border-right: 0;
}

.review-form-table th {
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: center;
  background: var(--el-fill-color-light);
}

.review-form-table__section-heading th {
  padding: 9px 12px;
  text-align: left;
  background: var(--el-fill-color);
}

.review-form-table__section-heading-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.review-form-table__repeatable-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.review-form-table__index {
  flex: 0 0 32px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.review-form-table__repeatable-row .el-textarea {
  flex: 1 1 auto;
  min-width: 0;
}

.review-form-table__row-action {
  flex: 0 0 88px;
  width: 88px;
  margin-left: auto;
}

.review-form-table__source-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.review-form-table__empty {
  padding: 20px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.review-form-table__required,
.form-field-error {
  color: var(--el-color-danger);
}

.review-form-table__cell--invalid {
  box-shadow: inset 0 0 0 1px var(--el-color-danger);
}

.form-field-error {
  display: block;
  margin-top: 4px;
}

.review-form-table :deep(.el-input),
.review-form-table :deep(.el-date-editor.el-input),
.review-form-table :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

.review-form-table :deep(.el-input__wrapper),
.review-form-table :deep(.el-textarea__inner) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.review-form-table :deep(.el-input__wrapper:hover),
.review-form-table :deep(.el-input__wrapper.is-focus),
.review-form-table :deep(.el-textarea__inner:hover),
.review-form-table :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 1px var(--el-color-primary);
}

.review-form-table :deep(.el-input.is-disabled .el-input__wrapper),
.review-form-table :deep(.el-textarea.is-disabled .el-textarea__inner) {
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
}
</style>
