<template>
  <h4>填写评审表</h4>
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

        <tr>
          <td colspan="4" class="review-form-table__matrix-cell">
            <table class="review-plan-matrix">
              <colgroup>
                <col class="review-plan-matrix__category" />
                <col class="review-plan-matrix__sequence" />
                <col class="review-plan-matrix__content" />
                <col class="review-plan-matrix__plan" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" aria-label="分类"></th>
                  <th scope="col">序号</th>
                  <th scope="col">具体内容</th>
                  <th scope="col">项目实施计划</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="source in repeatableFieldConfigs" :key="source.key">
                  <tr v-for="(item, index) in source.items" :key="`${source.key}:${index}`">
                    <th v-if="index === 0" :rowspan="source.items.length" scope="rowgroup" class="review-plan-matrix__category-cell">
                      <div class="review-plan-matrix__category-content">
                        <span>{{ source.title }}</span>
                        <el-button
                          class="review-form-table__row-action"
                          size="small"
                          type="primary"
                          plain
                          :disabled="disabled"
                          :aria-label="`新增${source.title}`"
                          @click="$emit('add-repeatable', source.key)"
                        >
                          新增一行
                        </el-button>
                      </div>
                    </th>
                    <td class="review-plan-matrix__sequence-cell">{{ index + 1 }}</td>
                    <td :data-field-key="source.key" :class="fieldClass(source.key)">
                      <div class="review-form-table__repeatable-row">
                        <el-input
                          :model-value="item"
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
                    <td
                      :data-plan-key="`${source.sourceType}:${index + 1}`"
                      :class="{ 'review-form-table__cell--invalid': isPlanInvalidKey(source.sourceType, index + 1) }"
                    >
                      <template v-if="planItemFor(source.sourceType, index + 1)">
                        <el-input
                          :model-value="planItemFor(source.sourceType, index + 1).planText"
                          :disabled="disabled"
                          :aria-label="`${planItemFor(source.sourceType, index + 1).sourceLabel}${index + 1}实施计划`"
                          placeholder="填写对应实施计划"
                          @update:model-value="planText => $emit('update-plan', { sourceType: source.sourceType, sourceIndex: index + 1, planText })"
                        />
                        <small v-if="isPlanInvalidKey(source.sourceType, index + 1)" class="form-field-error">请填写实施计划内容</small>
                      </template>
                      <span v-else class="review-plan-matrix__empty-plan">填写具体内容后生成计划项</span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
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

function planItemFor(sourceType, sourceIndex) {
  return props.implementationPlanItems.find(
    (item) => item.sourceType === sourceType && item.sourceIndex === sourceIndex
  );
}

function isPlanInvalidKey(sourceType, sourceIndex) {
  return props.invalidPlanKeys.includes(`${sourceType}:${sourceIndex}`);
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

.review-form-table td.review-form-table__matrix-cell {
  padding: 0;
}

.review-form-table__repeatable-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.review-form-table__repeatable-row .el-textarea {
  flex: 1 1 auto;
  min-width: 0;
}

.review-form-table__row-action {
  flex: 0 0 auto;
  width: 88px;
  height: 24px;
  margin-left: auto;
}

.review-plan-matrix {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.review-plan-matrix__category {
  width: 150px;
}

.review-plan-matrix__sequence {
  width: 56px;
}

.review-plan-matrix__content,
.review-plan-matrix__plan {
  width: calc((100% - 206px) / 2);
}

.review-plan-matrix__category-cell {
  vertical-align: middle;
}

.review-plan-matrix__category-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.review-plan-matrix__sequence-cell {
  color: var(--el-text-color-secondary);
  text-align: center;
}

.review-plan-matrix__empty-plan {
  display: block;
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
</style>
