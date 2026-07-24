<template>
  <div class="detailed-review-form-wrap">
    <table class="detailed-review-form">
      <colgroup>
        <col class="detailed-review-form__label" />
        <col class="detailed-review-form__value" />
        <col class="detailed-review-form__label" />
        <col class="detailed-review-form__value" />
      </colgroup>
      <tbody>
        <tr>
          <th scope="row">评审时间 <span class="detailed-review-form__required">*</span></th>
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
        <template v-for="section in repeatableSections" :key="section.key">
          <tr>
            <th scope="row">
              {{ section.contentLabel }} <span class="detailed-review-form__required">*</span>
            </th>
            <td colspan="3" :data-field-key="section.key" :class="fieldClass(section.key)">
              <div class="detailed-review-form__repeatable">
                <div
                  v-for="(item, index) in repeatableItemsFor(section.key)"
                  :key="`${section.key}:${index}`"
                  class="detailed-review-form__matrix-row"
                >
                  <div class="detailed-review-form__matrix-cell">
                    <span class="detailed-review-form__matrix-label">{{ section.label }}{{ index + 1 }}</span>
                    <el-input
                      :model-value="item"
                      type="textarea"
                      :rows="2"
                      :disabled="disabled"
                      :aria-label="`${section.contentLabel}${index + 1}`"
                      @update:model-value="$emit('update-repeatable', { key: section.key, index, value: $event })"
                    />
                  </div>
                  <div
                    class="detailed-review-form__matrix-cell"
                    :data-field-key="planFieldKey(section.key, index)"
                    :class="fieldClass(planFieldKey(section.key, index))"
                  >
                    <span class="detailed-review-form__matrix-label">实施计划</span>
                    <el-input
                      :model-value="planItemFor(section.key, index)"
                      type="textarea"
                      :rows="2"
                      :disabled="disabled"
                      :aria-label="`${section.label}${index + 1}实施计划`"
                      @update:model-value="$emit('update-plan-item', { key: section.key, index, value: $event })"
                    />
                  </div>
                  <el-button
                    class="detailed-review-form__row-action"
                    type="danger"
                    plain
                    size="small"
                    :disabled="disabled || repeatableItemsFor(section.key).length <= 1"
                    :aria-label="`删除${section.contentLabel}${index + 1}`"
                    @click="$emit('remove-repeatable', { key: section.key, index })"
                  >
                    删除
                  </el-button>
                </div>
                <el-button
                  class="detailed-review-form__add-action"
                  type="primary"
                  plain
                  size="small"
                  :disabled="disabled"
                  :aria-label="`新增${section.contentLabel}`"
                  @click="$emit('add-repeatable', section.key)"
                >
                  新增一行
                </el-button>
              </div>
            </td>
          </tr>
        </template>
        <tr>
          <th scope="row">评审结论 <span class="detailed-review-form__required">*</span></th>
          <td colspan="3" data-field-key="reviewConclusion" :class="fieldClass('reviewConclusion')">
            <el-input
              :model-value="displayValue(model.reviewConclusion)"
              type="textarea"
              :rows="3"
              :disabled="disabled"
              aria-label="评审结论"
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
  invalidFieldKeys: { type: Array, default: () => [] },
  disabled: Boolean
});

const emit = defineEmits([
  'update-field',
  'update-repeatable',
  'update-plan-item',
  'add-repeatable',
  'remove-repeatable'
]);

const repeatableSections = [
  { key: 'designGoalAchievement', label: '目标', contentLabel: '设计目标达成' },
  { key: 'designRiskAssessment', label: '风险', contentLabel: '设计风险评估' },
  { key: 'designOptimizationSuggestions', label: '建议', contentLabel: '设计优化建议' }
];

function displayValue(value) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function updateField(key, value) {
  emit('update-field', { key, value });
}

function repeatableItemsFor(key) {
  const value = props.model[key];
  if (Array.isArray(value)) {
    return value.length ? value : [''];
  }
  const text = String(value ?? '').trim();
  return text ? text.split(/\r?\n/) : [''];
}

function planFieldKey(key, index) {
  return `implementationPlanItems.${key}.${index}`;
}

function planItemFor(key, index) {
  return props.model.implementationPlanItems?.[key]?.[index] || '';
}

function fieldClass(key) {
  return { 'detailed-review-form__cell--invalid': props.invalidFieldKeys.includes(key) };
}
</script>

<style scoped>
.detailed-review-form-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--el-border-color);
}

.detailed-review-form {
  width: 100%;
  min-width: 860px;
  table-layout: fixed;
  border-collapse: collapse;
  background: var(--el-bg-color);
}

.detailed-review-form__label {
  width: 150px;
}

.detailed-review-form__value {
  width: calc(50% - 150px);
}

.detailed-review-form th,
.detailed-review-form td {
  padding: 8px;
  border-right: 1px solid var(--el-border-color);
  border-bottom: 1px solid var(--el-border-color);
  vertical-align: middle;
}

.detailed-review-form tr:last-child > * {
  border-bottom: 0;
}

.detailed-review-form tr > *:last-child {
  border-right: 0;
}

.detailed-review-form th {
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: center;
  background: var(--el-fill-color-light);
}

.detailed-review-form__repeatable {
  display: grid;
  gap: 8px;
}

.detailed-review-form__matrix-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) 72px;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.detailed-review-form__matrix-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.detailed-review-form__matrix-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detailed-review-form__matrix-row .el-textarea {
  min-width: 0;
}

.detailed-review-form__row-action {
  flex: 0 0 auto;
  width: 72px;
}

.detailed-review-form__add-action {
  justify-self: start;
}

.detailed-review-form__required {
  color: var(--el-color-danger);
}

.detailed-review-form__cell--invalid {
  box-shadow: inset 0 0 0 1px var(--el-color-danger);
}

.detailed-review-form__matrix-cell.detailed-review-form__cell--invalid {
  padding: 4px;
}

.detailed-review-form :deep(.el-input),
.detailed-review-form :deep(.el-date-editor.el-input),
.detailed-review-form :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

.detailed-review-form :deep(.el-input__wrapper),
.detailed-review-form :deep(.el-textarea__inner) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.detailed-review-form :deep(.el-input__wrapper:hover),
.detailed-review-form :deep(.el-input__wrapper.is-focus),
.detailed-review-form :deep(.el-textarea__inner:hover),
.detailed-review-form :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 1px var(--el-color-primary);
}

.detailed-review-form :deep(.el-input.is-disabled .el-input__wrapper),
.detailed-review-form :deep(.el-textarea.is-disabled .el-textarea__inner) {
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
}

@media (max-width: 720px) {
  .detailed-review-form__matrix-row {
    grid-template-columns: minmax(180px, 1fr);
  }
}
</style>
